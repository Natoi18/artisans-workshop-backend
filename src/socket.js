// src/socket.js
import { Server } from "socket.io";
import { db } from "./db/index.js";
import { messages } from "./db/schema.js";

export default function attachSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*" }, // tighten this in production
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // join room
    socket.on("joinRoom", ({ room }) => {
      socket.join(room);
      socket.emit("joined", { room });
    });

    // leave room
    socket.on("leaveRoom", ({ room }) => {
      socket.leave(room);
      socket.emit("left", { room });
    });

    // chat message
    socket.on("message", async ({ room, senderId, content }) => {
      // persist to DB (non-blocking)
      try {
        const [saved] = await db.insert(messages).values({
          room,
          senderId,
          content
        }).returning();

        // broadcast to room
        io.to(room).emit("message", {
          id: saved.id,
          room: saved.room,
          senderId: saved.senderId,
          content: saved.content,
          createdAt: saved.createdAt
        });
      } catch (err) {
        console.error("socket message save error", err);
        socket.emit("error", { message: "message save failed" });
      }
    });

    // fetch recent messages
    socket.on("fetchMessages", async ({ room, limit = 50 }) => {
      try {
        const msgs = await db.select().from(messages).where(messages.room.equals(room)).orderBy(messages.createdAt.desc()).limit(limit);
        socket.emit("messages", msgs.reverse());
      } catch (err) {
        console.error(err);
        socket.emit("error", { message: "failed to fetch messages" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

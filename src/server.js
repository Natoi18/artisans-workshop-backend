import http from "http";
import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import videoRoutes from "./routes/videos.js";
import paymentRoutes from "./routes/payments.js";
import agoraRoutes from "./routes/agora.js";
import piRoutes from "./routes/pi.js";
import piLoginRoutes from "./routes/piLogin.js";

import attachSocket from "./socket.js";

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/agora", agoraRoutes);
app.use("/api/pi", piRoutes);
app.use("/api/pi", piLoginRoutes);

app.get("/", (req, res) => res.send("Expert Artisan Backend Running..."));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// attach socket.io
const io = attachSocket(server);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

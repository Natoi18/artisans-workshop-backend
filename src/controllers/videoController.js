import { db } from "../db/index.js";
import { videos } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const createVideo = async (req, res) => {
  try {
    const { title, description, url, thumbnail, pricePi } = req.body;
    const ownerId = req.user.id;

    const [created] = await db.insert(videos).values({
      title,
      description,
      url,
      thumbnail,
      pricePi: pricePi || 0,
      ownerId,
    }).returning();

    res.json({ video: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const listVideos = async (req, res) => {
  try {
    const result = await db.select().from(videos).orderBy(videos.createdAt.desc());
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getVideo = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (!video) return res.status(404).json({ error: "Not found" });
    res.json(video);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateVideo = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ownerId = req.user.id;
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (!video) return res.status(404).json({ error: "Not found" });
    if (video.ownerId !== ownerId) return res.status(403).json({ error: "Not allowed" });

    const { title, description, url, thumbnail, pricePi } = req.body;
    await db.update(videos).set({
      title: title ?? video.title,
      description: description ?? video.description,
      url: url ?? video.url,
      thumbnail: thumbnail ?? video.thumbnail,
      pricePi: pricePi ?? video.pricePi,
    }).where(eq(videos.id, id));
    const [updated] = await db.select().from(videos).where(eq(videos.id, id));
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ownerId = req.user.id;
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (!video) return res.status(404).json({ error: "Not found" });
    if (video.ownerId !== ownerId) return res.status(403).json({ error: "Not allowed" });

    await db.delete(videos).where(eq(videos.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

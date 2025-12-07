import express from "express";
import { db } from "../db/index.js";
import { videos } from "../db/schema.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Upload video
router.post("/upload", protect, async (req, res) => {
  const { title, url, price } = req.body;

  const [newVideo] = await db.insert(videos).values({
    title,
    url,
    price,
    userId: req.user.id
  }).returning();

  res.json(newVideo);
});

// Get all videos
router.get("/", async (req, res) => {
  const result = await db.select().from(videos);
  res.json(result);
});

export default router;


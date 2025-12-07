import express from "express";
import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-payments", protect, async (req, res) => {
  const result = await db.select().from(payments)
    .where(eq(payments.userId, req.user.id));
  res.json(result);
});

export default router;

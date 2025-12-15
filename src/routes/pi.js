// src/routes/pi.js
import express from "express";
import crypto from "crypto";
import axios from "axios";
import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const PI_API_URL = "https://api.minepi.com";
const PI_API_KEY = process.env.PI_API_KEY;

/*
──────────────────────────────────────────
1️⃣ APPROVE PAYMENT (REQUIRED)
Frontend → Pi → Backend
──────────────────────────────────────────
*/
router.post("/approve", protect, async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: "Missing paymentId" });
  }

  try {
    // Approve on Pi server
    const response = await axios.post(
      `${PI_API_URL}/v2/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
        },
      }
    );

    // Save / update DB
    await db.insert(payments).values({
      userId: req.user.id,
      providerReference: paymentId,
      internalReference: crypto.randomUUID(),
      amount: response.data.amount,
      status: "approved",
    }).onConflictDoNothing();

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Pi approve failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Approve failed" });
  }
});

/*
──────────────────────────────────────────
2️⃣ COMPLETE PAYMENT (REQUIRED)
Frontend → Pi → Backend
──────────────────────────────────────────
*/
router.post("/complete", protect, async (req, res) => {
  const { paymentId, txid } = req.body;

  if (!paymentId || !txid) {
    return res.status(400).json({ error: "Missing paymentId or txid" });
  }

  try {
    await axios.post(
      `${PI_API_URL}/v2/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
        },
      }
    );

    await db
      .update(payments)
      .set({
        status: "completed",
        txId: txid,
      })
      .where(eq(payments.providerReference, paymentId));

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Pi complete failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Completion failed" });
  }
});

/*
──────────────────────────────────────────
3️⃣ PI WEBHOOK (OPTIONAL BUT GOOD)
Pi → Backend → DB
──────────────────────────────────────────
*/
router.post(
  "/webhook",
  express.json({ type: "*/*" }),
  async (req, res) => {
    const signature = req.headers["x-pi-signature"];
    const body = JSON.stringify(req.body);

    const expected = crypto
      .createHmac("sha256", process.env.PI_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expected) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { identifier, txid, status } = req.body;

    await db
      .update(payments)
      .set({
        status,
        txId: txid || null,
      })
      .where(eq(payments.providerReference, identifier));

    res.json({ ok: true });
  }
);

/*
──────────────────────────────────────────
4️⃣ CHECK PAYMENT STATUS
──────────────────────────────────────────
*/
router.get("/status/:paymentId", protect, async (req, res) => {
  const { paymentId } = req.params;

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerReference, paymentId));

  res.json(payment);
});

export default router;


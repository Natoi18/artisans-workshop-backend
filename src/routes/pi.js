// src/routes/pi.js
import express from "express";
import crypto from "crypto";
import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { protect } from "../middleware/authMiddleware.js";
import { pi } from "../utils/pi.js";

const router = express.Router();

/*
──────────────────────────────────────────
1️⃣ CREATE PAYMENT (Frontend → Backend → Pi)
──────────────────────────────────────────
*/
router.post("/create", protect, async (req, res) => {
  try {
    const { amount, videoId, metadata } = req.body;

    const internalPaymentId = crypto.randomUUID();

    const piRes = await pi.post("/payments", {
      amount,
      memo: metadata?.memo || "Artisan payment",
      metadata: {
        internalPaymentId,
        videoId,
      },
    });

    const piPaymentId = piRes.data.identifier;

    const [payment] = await db
      .insert(payments)
      .values({
        userId: req.user.id,
        videoId,
        amount,
        providerReference: piPaymentId,
        internalReference: internalPaymentId,
        status: "pending",
      })
      .returning();

    res.json({
      piPaymentId,
      internalPaymentId,
      payment,
    });
  } catch (err) {
    console.error("❌ Create payment failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Create payment failed" });
  }
});

/*
──────────────────────────────────────────
2️⃣ APPROVE PAYMENT (Pi SDK callback)
──────────────────────────────────────────
❌ NO AUTH HERE
*/
router.post("/approve", async (req, res) => {
  try {
    const { paymentId } = req.body;

    await pi.post(`/payments/${paymentId}/approve`);

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Approve failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Approve failed" });
  }
});

/*
──────────────────────────────────────────
3️⃣ COMPLETE PAYMENT (Pi SDK callback)
──────────────────────────────────────────
❌ NO AUTH HERE
*/
router.post("/complete", async (req, res) => {
  try {
    const { paymentId, txid } = req.body;

    await pi.post(`/payments/${paymentId}/complete`, {
      txid,
    });

    await db
      .update(payments)
      .set({
        status: "completed",
        txId: txid,
      })
      .where(eq(payments.providerReference, paymentId));

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Complete failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Complete failed" });
  }
});

/*
──────────────────────────────────────────
4️⃣ PI WEBHOOK (optional safety net)
──────────────────────────────────────────
*/
router.post("/webhook", express.json({ type: "*/*" }), async (req, res) => {
  try {
    const { identifier, txid, status } = req.body;

    await db
      .update(payments)
      .set({
        status,
        txId: txid || null,
      })
      .where(eq(payments.providerReference, identifier));

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).json({ error: "Webhook failed" });
  }
});

export default router;

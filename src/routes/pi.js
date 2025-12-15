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
1️⃣ CREATE PAYMENT
Frontend → Backend → Pi API
──────────────────────────────────────────
*/
router.post("/create", protect, async (req, res) => {
  try {
    const { amount, videoId, metadata } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const internalPaymentId = crypto.randomUUID();

    const piRes = await pi.post("/payments", {
      amount,
      memo: metadata?.memo || "Artisan payment",
      metadata: {
        internalPaymentId,
        videoId,
        userId: req.user.id,
      },
    });

    const piPaymentId = piRes.data.identifier;

    const [payment] = await db
      .insert(payments)
      .values({
        userId: req.user.id,
        videoId: videoId || null,
        amount,
        providerReference: piPaymentId,
        internalReference: internalPaymentId,
        status: "pending",
      })
      .returning();

    res.json({
      ok: true,
      piPaymentId,
      internalPaymentId,
      payment,
    });
  } catch (err) {
    console.error("❌ CREATE PAYMENT FAILED:", err.response?.data || err.message);
    res.status(500).json({ error: "Create payment failed" });
  }
});

/*
──────────────────────────────────────────
2️⃣ APPROVE PAYMENT
Pi SDK → Backend
(NO AUTH — Pi SDK CALL)
──────────────────────────────────────────
*/
router.post("/approve", async (req, res) => {
  try {
    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: "Missing paymentId" });
    }

    await pi.post(`/payments/${paymentId}/approve`);

    await db
      .update(payments)
      .set({ status: "approved" })
      .where(eq(payments.providerReference, paymentId));

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ APPROVE FAILED:", err.response?.data || err.message);
    res.status(500).json({ error: "Approve failed" });
  }
});

/*
──────────────────────────────────────────
3️⃣ COMPLETE PAYMENT
Pi SDK → Backend
(NO AUTH — Pi SDK CALL)
──────────────────────────────────────────
*/
router.post("/complete", async (req, res) => {
  try {
    const { paymentId, txid } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: "Missing paymentId" });
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerReference, paymentId));

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // ✅ Sandbox vs Production handling
    if (process.env.PI_ENV === "sandbox") {
      await pi.post(`/payments/${paymentId}/complete`);
    } else {
      if (!txid) {
        return res.status(400).json({ error: "Missing txid in production" });
      }
      await pi.post(`/payments/${paymentId}/complete`, { txid });
    }

    await db
      .update(payments)
      .set({
        status: "completed",
        txId: txid || null,
      })
      .where(eq(payments.providerReference, paymentId));

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ COMPLETE FAILED:", err.response?.data || err.message);
    res.status(500).json({ error: "Complete failed" });
  }
});

/*
──────────────────────────────────────────
4️⃣ WEBHOOK (SAFETY NET)
Pi → Backend
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
    console.error("❌ WEBHOOK ERROR:", err);
    res.status(500).json({ error: "Webhook failed" });
  }
});

/*
──────────────────────────────────────────
DEBUG (SAFE TO KEEP)
──────────────────────────────────────────
*/
console.log("🔑 PI_ENV:", process.env.PI_ENV);
console.log("🔑 PI_API_KEY exists:", !!process.env.PI_API_KEY);

export default router;

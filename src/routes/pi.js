// src/routes/pi.js
import express from "express";
import crypto from "crypto";
import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { protect } from "../middleware/authMiddleware.js";
import { pi } from "../utils/pi.js";   // ✅ Pi Network REST API client

const router = express.Router();

/*
──────────────────────────────────────────
 1️⃣ CREATE PAYMENT (Backend → Pi API → DB)
──────────────────────────────────────────
*/
router.post("/create", protect, async (req, res) => {
  try {
    const { amount, videoId, metadata } = req.body;

    // Generate your internal payment ID
    const internalPaymentId = crypto.randomUUID();

    // 1️⃣ Create payment on Pi Server
    const piPayment = await pi.post("/payments", {
      amount,
      user_uid: req.user.id,   // Pioneer UID (frontend passes this)
      metadata: metadata || {}, // optional
    });

    const piPaymentId = piPayment.data.identifier; // Pi payment reference

    // 2️⃣ Save to your database
    const [record] = await db
      .insert(payments)
      .values({
        userId: req.user.id,
        videoId,
        amount,
        providerReference: piPaymentId, // store Pi payment ID
        internalReference: internalPaymentId, // your ID
        status: "pending",
      })
      .returning();

    // 3️⃣ Return both IDs to frontend
    res.json({
      ok: true,
      piPaymentId,
      internalPaymentId,
      payment: record,
    });
  } catch (err) {
    console.error("Create payment failed:", err.response?.data || err.message);
    res.status(500).json({
      error: "Payment creation failed",
      details: err.response?.data || err.message,
    });
  }
});

/*
──────────────────────────────────────────
 2️⃣ PI WEBHOOK (Pi → Backend → DB)
──────────────────────────────────────────
*/
router.post(
  "/webhook",
  express.json({ type: "*/*" }),
  async (req, res) => {
    const signature = req.headers["x-pi-signature"];
    const body = JSON.stringify(req.body);

    // Validate webhook using HMAC SHA-256
    const expected = crypto
      .createHmac("sha256", process.env.PI_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (signature !== expected) {
      console.log("❌ Invalid Pi Webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    try {
      const { identifier, txid, status } = req.body; // Pi sends payment ID as "identifier"

      await db
        .update(payments)
        .set({
          status,
          txId: txid || null,
        })
        .where(eq(payments.providerReference, identifier));

      res.json({ ok: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).json({ error: "Webhook update failed" });
    }
  }
);

/*
──────────────────────────────────────────
 3️⃣ CHECK PAYMENT STATUS
──────────────────────────────────────────
*/
router.get("/status/:paymentId", protect, async (req, res) => {
  try {
    const paymentId = req.params.paymentId;

    const [result] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerReference, paymentId));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Status fetch failed" });
  }
});

export default router;

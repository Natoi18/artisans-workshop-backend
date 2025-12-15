// src/routes/pi.js
import express from "express";
import crypto from "crypto";
import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { pi } from "../utils/pi.js";

const router = express.Router();

/*
────────────────────────────────
1️⃣ APPROVE PAYMENT (NO AUTH)
────────────────────────────────
*/
router.post("/approve", async (req, res) => {
  try {
    const { paymentId } = req.body;

    await pi.post(`/payments/${paymentId}/approve`);

    await db
      .update(payments)
      .set({ status: "approved" })
      .where(eq(payments.providerReference, paymentId));

    res.json({ ok: true });
  } catch (err) {
    console.error("Approve error:", err.response?.data || err.message);
    res.status(500).json({ error: "Approve failed" });
  }
});

/*
────────────────────────────────
2️⃣ COMPLETE PAYMENT (NO AUTH)
────────────────────────────────
*/
router.post("/complete", async (req, res) => {
  try {
    const { paymentId, txid } = req.body;

    await pi.post(`/payments/${paymentId}/complete`, { txid });

    await db
      .update(payments)
      .set({ status: "completed", txId: txid })
      .where(eq(payments.providerReference, paymentId));

    res.json({ ok: true });
  } catch (err) {
    console.error("Complete error:", err.response?.data || err.message);
    res.status(500).json({ error: "Complete failed" });
  }
});

/*
────────────────────────────────
3️⃣ WEBHOOK (OPTIONAL BUT OK)
────────────────────────────────
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
      .set({ status, txId: txid || null })
      .where(eq(payments.providerReference, identifier));

    res.json({ ok: true });
  }
);

export default router;

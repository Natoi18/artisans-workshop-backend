// src/routes/agora.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();

// ✅ Import CommonJS module correctly in ESM
import Agora from "agora-access-token";
const { RtcRole, RtcTokenBuilder } = Agora;

const router = express.Router();

// Example route to generate a token
router.get("/token", (req, res) => {
  const { channelName, uid } = req.query;

  if (!channelName || !uid) {
    return res.status(400).json({ message: "channelName and uid are required" });
  }

  const appID = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  const role = RtcRole.PUBLISHER;
  const expireTime = 3600; // 1 hour

  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTime + expireTime;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    Number(uid),
    role,
    privilegeExpireTime
  );

  res.json({ token });
});

export default router;

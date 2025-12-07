import express from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateToken } from "../utils/generateToken.js";

const router = express.Router();

router.use(express.json());

/*
──────────────────────────────────────────
 1️⃣ VERIFY PI USER (Frontend → Backend)
──────────────────────────────────────────
Frontend will send:
{ piUser: { uid, username } }
──────────────────────────────────────────
*/
router.post("/signin", async (req, res) => {
  try {
    const { piUser } = req.body;

    if (!piUser || !piUser.uid) {
      return res.status(400).json({ error: "Invalid Pi user payload" });
    }

    const { uid, username } = piUser;

    // Use UID as unique email format
    const email = `${uid}@pi`;

    // Check if user exists
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    // Auto-create Pi user if not found
    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name: username || "Pi User",
          password: "pi-user", // placeholder (not used)
          role: "artisan",
        })
        .returning();

      user = newUser;
    }

    // Generate your JWT session token
    const token = generateToken(user.id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (err) {
    console.error("Pi Login Error:", err);
    return res.status(500).json({ error: "Pi login failed" });
  }
});

export default router;

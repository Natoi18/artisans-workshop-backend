import express from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateToken } from "../utils/generateToken.js";

const router = express.Router();

// Enable JSON parsing
router.use(express.json());

// ===============================
// REGISTER
// ===============================
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    // Check user exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0)
      return res.status(400).json({ error: "Email already exists" });

    // Hash password
    const hash = bcrypt.hashSync(password, 10);

    // Save user
    const [newUser] = await db.insert(users)
      .values({
        email,
        password: hash,
        name: name || "New User"
      })
      .returning();

    // Return token + user
    return res.json({
      message: "Account created successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
      token: generateToken(newUser.id),
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// LOGIN
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    // Compare password
    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid email or password" });

    // Success response
    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || null,
      },
      token: generateToken(user.id),
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

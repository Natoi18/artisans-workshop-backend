import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "name, email and password required" });
    }

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length) return res.status(400).json({ error: "Email already in use" });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [created] = await db.insert(users).values({
      name,
      email,
      password: hash,
      role: role || "artisan",
    }).returning();

    const token = jwt.sign({ id: created.id, email: created.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ user: { id: created.id, name: created.name, email: created.email, role: created.role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

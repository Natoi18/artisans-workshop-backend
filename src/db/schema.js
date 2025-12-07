// src/db/schema.js
import { pgTable, serial, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  avatarUrl: text("avatarUrl"),
  role: varchar("role", { length: 50 }).default("artisan"),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Videos table
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  url: text("url").notNull(),
  thumbnail: text("thumbnail"),
  pricePi: integer("pricePi").default(0),
  createdAt: timestamp("createdAt").defaultNow(),

  ownerId: integer("ownerId").references(() => users.id),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("PI"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("createdAt").defaultNow(),

  userId: integer("userId").references(() => users.id),
  videoId: integer("videoId").references(() => videos.id),
});

// add to imports: timestamp (already present)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  room: varchar("room", { length: 255 }).notNull(),
  senderId: integer("sender_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

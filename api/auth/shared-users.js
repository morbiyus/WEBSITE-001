/**
 * VAZEDGAME — Shared User Store
 *
 * In-memory user account store imported by login, register, and verify-code endpoints.
 *
 * IMPORTANT: This is a development placeholder. Vercel serverless functions do
 * NOT guarantee shared in-memory state across cold starts or separate instances.
 *
 * For production, replace this with a real database:
 *   - Vercel Postgres (recommended for Vercel)
 *   - Supabase (PostgreSQL + Auth)
 *   - Upstash Redis + custom user table
 *
 * Required environment variables:
 *   DATABASE_URL — connection string for your production database
 */

const usersStore = new Map(); // id -> { id, username, email, passwordHash, emailVerified, createdAt }
const emailIndex = new Map(); // email.lowercase() -> userId
const usernameIndex = new Map(); // username.lowercase() -> userId

let nextId = 1;

module.exports = {
  usersStore,
  emailIndex,
  usernameIndex,
  nextId,
};

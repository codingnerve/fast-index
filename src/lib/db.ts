import mongoose from "mongoose";

// Serverless-safe MongoDB connection. On Vercel each function invocation may
// reuse a warm container, so we cache the connection on the global object to
// avoid opening a new connection (and exhausting the pool) on every request.

const MONGODB_URI = process.env.DATABASE_URL;

type Cached = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { _mongoose?: Cached };
const cached: Cached = globalForMongoose._mongoose ?? { conn: null, promise: null };
globalForMongoose._mongoose = cached;

/** Connect (or reuse an existing connection) before running any query. */
export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("DATABASE_URL is not set (MongoDB connection string).");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

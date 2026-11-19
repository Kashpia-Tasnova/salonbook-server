import { MongoClient, Db } from "mongodb";
import { setServers } from "node:dns";
setServers(["8.8.8.8", "8.8.4.4"]);

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from environment variables");
}

if (!DB_NAME) {
  throw new Error("DB_NAME is missing from environment variables");
}

const client = new MongoClient(MONGODB_URI);

let database: Db;

export const connectDB = async (): Promise<void> => {
  try {
    await client.connect();

    database = client.db(DB_NAME);

    console.log("MongoDB connected successfully!");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export const getDB = (): Db => {
  if (!database) {
    throw new Error("Database is not connected yet");
  }

  return database;
};
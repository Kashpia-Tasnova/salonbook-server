
import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

import { connectDB, getDB } from "./config/database.js";
import { createAuth } from "./lib/auth.js";
import createUploadRoutes from "./routes/upload.js";
import createProtectedRoutes from "./routes/protected.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "SalonBook API is running!",
  });
});

const PORT = process.env.PORT || 5000;

// Remove Google account records that reference users
// that no longer exist in the user collection.
const cleanupOrphanedGoogleAccounts = async () => {
  try {
    const db = getDB();

    const googleAccounts = await db
      .collection("account")
      .find(
        { providerId: "google" },
        { projection: { _id: 1, userId: 1 } }
      )
      .toArray();

    let removedCount = 0;

    for (const account of googleAccounts) {
      const existingUser = await db
        .collection("user")
        .findOne({ _id: account.userId });

      if (!existingUser) {
        const result = await db.collection("account").deleteOne({
          _id: account._id,
          providerId: "google",
          userId: account.userId,
        });

        removedCount += result.deletedCount;
      }
    }

    console.log(
      `Google account cleanup completed. Removed ${removedCount} orphaned account(s).`
    );
  } catch (error) {
    console.error("Google account cleanup failed:", error);
    throw error;
  }
};

const startServer = async () => {
  try {
    await connectDB();

    // Repair broken Google account references before OAuth starts.
    await cleanupOrphanedGoogleAccounts();

    // Initialize Better Auth after MongoDB connects.
    const auth = createAuth();

    // Better Auth must receive requests before express.json().
    app.all("/api/auth/*splat", toNodeHandler(auth));

    app.use(express.json());

    app.use("/api/upload", createUploadRoutes(auth));

    // Protected routes
    app.use("/api/protected", createProtectedRoutes(auth));

    app.listen(PORT, () => {
      console.log(`SalonBook server running on port ${PORT}`);
      console.log("Better Auth API is ready!");
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();

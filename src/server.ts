import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";

import { connectDB } from "./config/database.js";
import { createAuth } from "./lib/auth.js";
import uploadRoutes from "./routes/upload.js";

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

const startServer = async () => {
  try {
    await connectDB();

    // Initialize Better Auth after MongoDB connects.
    const auth = createAuth();

    // Better Auth must receive requests before express.json().
    app.all("/api/auth/*splat", toNodeHandler(auth));

    app.use(express.json());
    app.use("/api/upload", uploadRoutes);

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
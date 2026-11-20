
import "dotenv/config";

import { connectDB, getDB } from "../config/database.js";
import { createAuth } from "../lib/auth.js";

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Blush & Bloom Admin";

    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL or ADMIN_PASSWORD is missing from .env");
    }

    await connectDB();

    const db = getDB();
    const usersCollection = db.collection("user");

    // Do not silently promote an account that already exists.
    const existingAdmin = await usersCollection.findOne({
      email: adminEmail,
    });

    if (existingAdmin) {
      throw new Error(
        "An account with the configured admin email already exists. Stop and verify it before proceeding."
      );
    }

    const auth = createAuth();

    // Better Auth creates the account and securely hashes its password.
    await auth.api.signUpEmail({
      body: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
      },
    });

    // Assign the admin role directly from the trusted backend.
    const result = await usersCollection.updateOne(
      { email: adminEmail },
      {
        $set: {
          role: "admin",
          name: adminName,
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("Admin account was created, but its role could not be updated.");
    }

    console.log("Admin account created successfully!");
    console.log(`Admin login identifier: ${adminEmail}`);
    console.log("Admin role: admin");
  } catch (error) {
    console.error("Admin seeding failed:", error);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
};

seedAdmin();

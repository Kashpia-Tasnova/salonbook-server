import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getDB } from "../config/database.js";

const authSecret = process.env.BETTER_AUTH_SECRET;

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is missing from environment variables");
}

export const createAuth = () => {
  return betterAuth({
    database: mongodbAdapter(getDB()),

    secret: authSecret,

    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",

    trustedOrigins: [
      process.env.CLIENT_URL || "http://localhost:3000",
    ],

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
  });
};
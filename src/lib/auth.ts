
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getDB } from "../config/database.js";

const authSecret = process.env.BETTER_AUTH_SECRET;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is missing from environment variables");
}

if (!googleClientId || !googleClientSecret) {
  throw new Error("Google OAuth credentials are missing from environment variables");
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

    // Every newly registered user is automatically a customer.
    // Public signup cannot choose or modify their role.
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "customer",
          input: false,
        },
      },
    },

    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
  });
};

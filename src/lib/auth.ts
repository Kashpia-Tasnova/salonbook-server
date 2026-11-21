
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
  throw new Error(
    "Google OAuth credentials are missing from environment variables"
  );
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

    // Allow users to link Google to an existing account
    // when the email addresses match.
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        updateUserInfoOnLink: true,
      },
    },

    user: {
      additionalFields: {
        // Every newly registered user is automatically a customer.
        role: {
          type: "string",
          required: false,
          defaultValue: "customer",
          input: false,
        },

        // Blocking status is controlled only by administrators.
        isBlocked: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },

        // Users can save and update their own phone number.
        phone: {
          type: "string",
          required: false,
          input: true,
        },
      },
    },

    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,

        // Prevent Google sign-in from automatically creating new users.
        // Explicit Google signup will use requestSignUp: true.
        disableImplicitSignUp: true,
      },
    },
  });
};

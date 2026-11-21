
import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { ObjectId } from "mongodb";

import { connectDB, getDB } from "./config/database.js";
import { createAuth } from "./lib/auth.js";
import { stripe } from "./lib/stripe.js";

import createUploadRoutes from "./routes/upload.js";
import createProtectedRoutes from "./routes/protected.js";
import createPaymentRoutes from "./routes/payment.js";

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

// Start Express server
const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();

    // Prevent duplicate transaction records for the same Stripe session.
    await getDB()
      .collection("transactions")
      .createIndex(
        { stripeSessionId: 1 },
        {
          unique: true,
          partialFilterExpression: {
            stripeSessionId: { $type: "string" },
          },
        }
      );

    // Clean up orphaned Google accounts.
    await cleanupOrphanedGoogleAccounts();

    // Initialize Better Auth after MongoDB connects.
    const auth = createAuth();

    // Better Auth must receive requests before express.json().
    app.all("/api/auth/*splat", toNodeHandler(auth));

    // Stripe webhook must use the raw request body.
    // Register it before express.json().
    app.post(
      "/api/payment/webhook",
      express.raw({ type: "application/json" }),
      async (req, res) => {
        const signature = req.headers["stripe-signature"];

        if (!signature) {
          return res.status(400).send("Missing Stripe signature.");
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
          console.error("STRIPE_WEBHOOK_SECRET is missing.");
          return res.status(500).send("Webhook configuration error.");
        }

        try {
          // Verify Stripe webhook signature.
          const event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            webhookSecret
          );

          // Handle successful Checkout payments.
          if (event.type === "checkout.session.completed") {
            const session = event.data.object;

            if (session.payment_status === "paid") {
              const appointmentId = session.metadata?.appointmentId;
              const customerId = session.metadata?.customerId;

              // Validate metadata.
              if (
                !appointmentId ||
                !customerId ||
                !ObjectId.isValid(appointmentId)
              ) {
                console.error(
                  "Invalid appointment metadata:",
                  session.id
                );

                return res.status(200).json({ received: true });
              }

              const db = getDB();

              // Find the appointment belonging to this customer.
              const appointment = await db
                .collection("appointments")
                .findOne({
                  _id: new ObjectId(appointmentId),
                  customerId,
                });

              if (!appointment) {
                console.error(
                  "Appointment not found:",
                  appointmentId
                );

                return res.status(200).json({ received: true });
              }

              // Verify the Checkout Session belongs to this appointment.
              if (appointment.stripeSessionId !== session.id) {
                console.error(
                  "Stripe session does not match appointment:",
                  session.id
                );

                return res.status(200).json({ received: true });
              }

              // Update appointment payment status.
              await db.collection("appointments").updateOne(
                {
                  _id: new ObjectId(appointmentId),
                  customerId,
                  stripeSessionId: session.id,
                  paymentStatus: "unpaid",
                },
                {
                  $set: {
                    paymentStatus: "paid",
                    updatedAt: new Date(),
                  },
                }
              );

              // Save transaction only once per Stripe Checkout Session.
              await db.collection("transactions").updateOne(
                {
                  stripeSessionId: session.id,
                },
                {
                  $setOnInsert: {
                    stripeSessionId: session.id,
                    appointmentId,
                    customerId,
                    serviceName: appointment.serviceName,
                    amount: session.amount_total,
                    currency: session.currency,
                    paymentStatus: "paid",
                    paymentMethod: "stripe",
                    createdAt: new Date(session.created * 1000),
                  },
                },
                {
                  upsert: true,
                }
              );

              console.log(
                "Payment successfully recorded:",
                session.id
              );
            }
          }

          return res.status(200).json({
            received: true,
          });
        } catch (error) {
          console.error("Stripe webhook processing failed:", error);

          return res.status(400).send(
            "Webhook signature or processing failed."
          );
        }
      }
    );

    // Parse JSON bodies for the remaining API routes.
    app.use(express.json());

    // Register payment routes.
    app.use("/api/payment", createPaymentRoutes(auth));

    // Register upload routes.
    app.use("/api/upload", createUploadRoutes(auth));

    // Register protected routes.
    app.use("/api/protected", createProtectedRoutes(auth));

    // Start server.
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

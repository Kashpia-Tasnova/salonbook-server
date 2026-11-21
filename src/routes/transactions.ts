
import { Router } from "express";
import { ObjectId } from "mongodb";
import type { createAuth } from "../lib/auth.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDB } from "../config/database.js";

type AuthInstance = ReturnType<typeof createAuth>;

const createTransactionRoutes = (auth: AuthInstance) => {
  const router = Router();

  // Get all transactions (Admin only).
  // This endpoint is read-only: it does not modify payment records.
  router.get(
    "/",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const db = getDB();

        const transactions = await db
          .collection("transactions")
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        const detailedTransactions = await Promise.all(
          transactions.map(async (transaction) => {
            let appointment = null;

            // Retrieve the related appointment.
            if (
              typeof transaction.appointmentId === "string" &&
              ObjectId.isValid(transaction.appointmentId)
            ) {
              appointment = await db
                .collection("appointments")
                .findOne({
                  _id: new ObjectId(transaction.appointmentId),
                });
            }

            // Retrieve customer information when available.
            let customer = null;

            if (
              typeof transaction.customerId === "string" &&
              ObjectId.isValid(transaction.customerId)
            ) {
              customer = await db.collection("user").findOne(
                {
                  _id: new ObjectId(transaction.customerId),
                },
                {
                  projection: {
                    name: 1,
                    email: 1,
                    image: 1,
                    phone: 1,
                  },
                }
              );
            }

            return {
              _id: transaction._id.toString(),

              customer: {
                name:
                  customer?.name ||
                  appointment?.customerName ||
                  "Unknown Customer",
                email:
                  customer?.email ||
                  appointment?.customerEmail ||
                  "No email available",
                image: customer?.image || "",
                phone: customer?.phone || "",
              },

              serviceName:
                appointment?.serviceName ||
                transaction.serviceName ||
                "Unknown Service",

              appointmentDate:
                appointment?.appointmentDate || null,

              appointmentTime:
                appointment?.time || null,

              amount: Number(transaction.amount || 0) / 100,

              currency: (
                transaction.currency || "usd"
              ).toUpperCase(),

              stripeSessionId:
                transaction.stripeSessionId || "",

              stripeSessionReference:
                transaction.stripeSessionId
                  ? `...${transaction.stripeSessionId.slice(-12)}`
                  : "Unavailable",

              paymentStatus:
                transaction.paymentStatus || "unknown",

              paymentMethod:
                transaction.paymentMethod || "stripe",

              transactionDate:
                transaction.createdAt || null,
            };
          })
        );

        return res.status(200).json({
          success: true,
          total: detailedTransactions.length,
          transactions: detailedTransactions,
        });
      } catch (error) {
        console.error("Get admin transactions error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to fetch transactions.",
        });
      }
    }
  );

  return router;
};

export default createTransactionRoutes;

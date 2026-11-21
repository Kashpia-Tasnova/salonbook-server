
import { Router } from "express";
import type { Response } from "express";
import { ObjectId } from "mongodb";
import type { createAuth } from "../lib/auth.js";
import {
  requireAuth,
  requireRole,
} from "../middleware/authMiddleware.js";
import { getDB } from "../config/database.js";
import { stripe } from "../lib/stripe.js";

type AuthInstance = ReturnType<typeof createAuth>;

const createPaymentRoutes = (auth: AuthInstance) => {
  const router = Router();

  router.post(
    "/create-checkout-session",
    requireAuth(auth),
    requireRole("customer"),
    async (req, res: Response) => {
      try {
        const { appointmentId } = req.body;

        if (
          typeof appointmentId !== "string" ||
          !ObjectId.isValid(appointmentId)
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid appointment ID.",
          });
        }

        const session = res.locals.session;
        const customerId = session.user.id;

        const db = getDB();

        const appointment = await db.collection("appointments").findOne({
          _id: new ObjectId(appointmentId),
          customerId,
        });

        if (!appointment) {
          return res.status(404).json({
            success: false,
            message: "Appointment not found.",
          });
        }

        if (appointment.status !== "confirmed") {
          return res.status(400).json({
            success: false,
            message: "Only confirmed appointments can be paid.",
          });
        }

        if (appointment.paymentStatus === "paid") {
          return res.status(400).json({
            success: false,
            message: "This appointment has already been paid.",
          });
        }

        // Appointment prices are entered and stored in USD.
        // Stripe expects the amount in cents.
        const amount = Math.round(Number(appointment.price) * 100);

        if (!Number.isSafeInteger(amount) || amount <= 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid appointment price.",
          });
        }

        const clientUrl = process.env.CLIENT_URL;

        if (!clientUrl) {
          throw new Error("CLIENT_URL is missing.");
        }

        const checkoutSession =
          await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: appointment.serviceName,
                  },
                  unit_amount: amount,
                },
                quantity: 1,
              },
            ],
            metadata: {
              appointmentId: appointment._id.toString(),
              customerId,
            },
            success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/payment/cancel`,
          });

        await db.collection("appointments").updateOne(
          {
            _id: appointment._id,
            customerId,
            paymentStatus: "unpaid",
          },
          {
            $set: {
              stripeSessionId: checkoutSession.id,
              updatedAt: new Date(),
            },
          }
        );

        return res.status(200).json({
          success: true,
          url: checkoutSession.url,
        });
      } catch (error) {
        console.error("Checkout session creation failed:", error);

        return res.status(500).json({
          success: false,
          message: "Unable to start payment. Please try again.",
        });
      }
    }
  );

  return router;
};

export default createPaymentRoutes;


import { Router } from "express";
import type { createAuth } from "../lib/auth.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDB } from "../config/database.js";

type AuthInstance = ReturnType<typeof createAuth>;

const createProtectedRoutes = (auth: AuthInstance) => {
  const router = Router();

  
  // Admin dashboard statistics API.
  router.get(
    "/admin/stats",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const db = getDB();

        const usersCollection = db.collection("user");
        const servicesCollection = db.collection("services");
        const appointmentsCollection = db.collection("appointments");
        const transactionsCollection = db.collection("transactions");

        const [
          totalServices,
          totalAppointments,
          totalCustomers,
          totalTransactions,
          recentAppointments,
        ] = await Promise.all([
          servicesCollection.countDocuments(),
          appointmentsCollection.countDocuments(),
          usersCollection.countDocuments({ role: "customer" }),
          transactionsCollection.countDocuments(),
          appointmentsCollection
            .find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray(),
        ]);

        return res.status(200).json({
          success: true,
          stats: {
            totalServices,
            totalAppointments,
            totalCustomers,
            totalTransactions,
          },
          recentAppointments,
        });
      } catch (error) {
        console.error("Admin statistics error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to fetch admin dashboard statistics.",
        });
      }
    }
  );


  // Only customers can access this endpoint.
  router.get(
    "/customer",
    requireAuth(auth),
    requireRole("customer"),
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Customer access granted!",
      });
    }
  );

  // Update the authenticated user's own profile.
  router.patch("/profile", requireAuth(auth), async (req, res) => {
    try {
      const session = res.locals.session;
      const email = session.user.email;

      const { name, phone, image } = req.body;

      const updates: {
        name?: string;
        phone?: string;
        image?: string;
      } = {};

      if (name !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid name.",
          });
        }

        if (name.trim().length > 100) {
          return res.status(400).json({
            success: false,
            message: "Name cannot exceed 100 characters.",
          });
        }

        updates.name = name.trim();
      }

      if (phone !== undefined) {
        if (typeof phone !== "string" || phone.length > 20) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid phone number.",
          });
        }

        updates.phone = phone.trim();
      }

      if (image !== undefined) {
        if (typeof image !== "string") {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid profile image URL.",
          });
        }

        try {
          const imageUrl = new URL(image);

          if (imageUrl.protocol !== "https:") {
            throw new Error("Invalid image URL protocol");
          }
        } catch {
          return res.status(400).json({
            success: false,
            message: "Profile image must be a valid HTTPS URL.",
          });
        }

        updates.image = image;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No profile information was provided.",
        });
      }

      const usersCollection = getDB().collection("user");

      const result = await usersCollection.updateOne(
        { email },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "User profile was not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        profile: {
          name: updates.name,
          phone: updates.phone,
          image: updates.image,
        },
      });
    } catch (error) {
      console.error("Profile update error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update profile.",
      });
    }
  });

  return router;
};

export default createProtectedRoutes;


import { Router } from "express";
import type { createAuth } from "../lib/auth.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDB } from "../config/database.js";

type AuthInstance = ReturnType<typeof createAuth>;

const createProtectedRoutes = (auth: AuthInstance) => {
  const router = Router();

  // Create a new salon service (Admin only).
  router.post(
    "/admin/services",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const {
          name,
          category,
          shortDescription,
          description,
          image,
          price,
          duration,
          whatToExpect,
        } = req.body;

        // Validate service name.
        if (
          typeof name !== "string" ||
          !name.trim() ||
          name.trim().length > 100
        ) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid service name.",
          });
        }

        // Validate category.
        if (typeof category !== "string" || !category.trim()) {
          return res.status(400).json({
            success: false,
            message: "Please select a service category.",
          });
        }

        // Validate short description.
        if (
          typeof shortDescription !== "string" ||
          !shortDescription.trim() ||
          shortDescription.trim().length > 250
        ) {
          return res.status(400).json({
            success: false,
            message: "Please provide a short description (maximum 250 characters).",
          });
        }

        // Validate full description.
        if (
          typeof description !== "string" ||
          !description.trim() ||
          description.trim().length > 2000
        ) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid full description.",
          });
        }

        // Validate service price.
        if (
          typeof price !== "number" ||
          !Number.isFinite(price) ||
          price <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid service price.",
          });
        }

        // Validate service duration.
        if (!Number.isInteger(duration) || duration <= 0) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid duration in minutes.",
          });
        }

        // Validate service image URL.
        if (typeof image !== "string" || !image.trim()) {
          return res.status(400).json({
            success: false,
            message: "Please provide a service image URL.",
          });
        }

        try {
          const imageUrl = new URL(image);

          if (imageUrl.protocol !== "https:") {
            throw new Error("Invalid image URL");
          }
        } catch {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid HTTPS image URL.",
          });
        }

        // Validate What to Expect checklist.
        if (
          !Array.isArray(whatToExpect) ||
          whatToExpect.length === 0 ||
          whatToExpect.length > 10 ||
          !whatToExpect.every(
            (item: unknown) =>
              typeof item === "string" &&
              item.trim().length > 0 &&
              item.trim().length <= 200
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Provide between 1 and 10 valid What to Expect points.",
          });
        }

        const now = new Date();

        const newService = {
          name: name.trim(),
          category: category.trim(),
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          image: image.trim(),
          price,
          duration,
          whatToExpect: whatToExpect.map(
            (item: string) => item.trim()
          ),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const servicesCollection = getDB().collection("services");

        const result = await servicesCollection.insertOne(newService);

        return res.status(201).json({
          success: true,
          message: "Service created successfully.",
          service: {
            _id: result.insertedId,
            ...newService,
          },
        });
      } catch (error) {
        console.error("Create service error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to create service.",
        });
      }
    }
  );

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
      return res.status(200).json({
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

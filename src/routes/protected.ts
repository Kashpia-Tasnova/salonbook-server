
import { Router } from "express";
import { ObjectId } from "mongodb";
import type { createAuth } from "../lib/auth.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDB } from "../config/database.js";

type AuthInstance = ReturnType<typeof createAuth>;

const createProtectedRoutes = (auth: AuthInstance) => {
  const router = Router();

  // Get all salon services (Admin only).
  router.get(
    "/admin/services",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const servicesCollection = getDB().collection("services");

        const services = await servicesCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        return res.status(200).json({
          success: true,
          total: services.length,
          services,
        });
      } catch (error) {
        console.error("Get admin services error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to fetch services.",
        });
      }
    }
  );

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
            message:
              "Please provide a short description (maximum 250 characters).",
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
            message:
              "Provide between 1 and 10 valid What to Expect points.",
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

  // Update an existing salon service (Admin only).
  router.patch(
    "/admin/services/:id",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const id = req.params.id;

        // Validate MongoDB ObjectId.
        if (typeof id !== "string" || !ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid service ID.",
          });
        }

        const {
          name,
          category,
          shortDescription,
          description,
          image,
          price,
          duration,
          whatToExpect,
          isActive,
        } = req.body;

        const updates: {
          name?: string;
          category?: string;
          shortDescription?: string;
          description?: string;
          image?: string;
          price?: number;
          duration?: number;
          whatToExpect?: string[];
          isActive?: boolean;
          updatedAt?: Date;
        } = {};

        // Validate and update service name.
        if (name !== undefined) {
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

          updates.name = name.trim();
        }

        // Validate and update category.
        if (category !== undefined) {
          if (typeof category !== "string" || !category.trim()) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid service category.",
            });
          }

          updates.category = category.trim();
        }

        // Validate and update short description.
        if (shortDescription !== undefined) {
          if (
            typeof shortDescription !== "string" ||
            !shortDescription.trim() ||
            shortDescription.trim().length > 250
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Short description must be between 1 and 250 characters.",
            });
          }

          updates.shortDescription = shortDescription.trim();
        }

        // Validate and update full description.
        if (description !== undefined) {
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

          updates.description = description.trim();
        }

        // Validate and update image URL.
        if (image !== undefined) {
          if (typeof image !== "string" || !image.trim()) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid service image URL.",
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

          updates.image = image.trim();
        }

        // Validate and update price.
        if (price !== undefined) {
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

          updates.price = price;
        }

        // Validate and update duration.
        if (duration !== undefined) {
          if (!Number.isInteger(duration) || duration <= 0) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid duration in minutes.",
            });
          }

          updates.duration = duration;
        }

        // Validate and update What to Expect checklist.
        if (whatToExpect !== undefined) {
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
              message:
                "Provide between 1 and 10 valid What to Expect points.",
            });
          }

          updates.whatToExpect = whatToExpect.map(
            (item: string) => item.trim()
          );
        }

        // Validate and update active status.
        if (isActive !== undefined) {
          if (typeof isActive !== "boolean") {
            return res.status(400).json({
              success: false,
              message: "Service active status must be true or false.",
            });
          }

          updates.isActive = isActive;
        }

        // Check whether at least one field was provided.
        if (Object.keys(updates).length === 0) {
          return res.status(400).json({
            success: false,
            message: "Please provide at least one field to update.",
          });
        }

        updates.updatedAt = new Date();

        const servicesCollection = getDB().collection("services");

        const result = await servicesCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updates },
          { returnDocument: "after" }
        );

        if (!result) {
          return res.status(404).json({
            success: false,
            message: "Salon service was not found.",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Service updated successfully.",
          service: result,
        });
      } catch (error) {
        console.error("Update service error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to update service.",
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
            throw new Error("Invalid image URL");
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

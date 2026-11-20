
import { Router } from "express";
import { ObjectId } from "mongodb";
import type { createAuth } from "../lib/auth.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getDB } from "../config/database.js";

type AuthInstance = ReturnType<typeof createAuth>;

const createProtectedRoutes = (auth: AuthInstance) => {
  const router = Router();


  // Get all active salon services (Public).
  router.get("/services", async (req, res) => {
    try {
      const servicesCollection = getDB().collection("services");

      const services = await servicesCollection
        .find({ isActive: true })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        total: services.length,
        services,
      });
    } catch (error) {
      console.error("Get public services error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch services.",
      });
    }
  });

  // Get one active salon service by ID (Public).
  router.get("/services/:id", async (req, res) => {
    try {
      const id = req.params.id;

      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service ID.",
        });
      }

      const service = await getDB()
        .collection("services")
        .findOne({
          _id: new ObjectId(id),
          isActive: true,
        });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found.",
        });
      }

      return res.status(200).json({
        success: true,
        service,
      });
    } catch (error) {
      console.error("Get public service details error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch service details.",
      });
    }
  });


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

        if (typeof category !== "string" || !category.trim()) {
          return res.status(400).json({
            success: false,
            message: "Please select a service category.",
          });
        }

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

        if (!Number.isInteger(duration) || duration <= 0) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid duration in minutes.",
          });
        }

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

        if (category !== undefined) {
          if (typeof category !== "string" || !category.trim()) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid service category.",
            });
          }

          updates.category = category.trim();
        }

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

        if (duration !== undefined) {
          if (!Number.isInteger(duration) || duration <= 0) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid duration in minutes.",
            });
          }

          updates.duration = duration;
        }

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

        if (isActive !== undefined) {
          if (typeof isActive !== "boolean") {
            return res.status(400).json({
              success: false,
              message: "Service active status must be true or false.",
            });
          }

          updates.isActive = isActive;
        }

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

  // Permanently delete a salon service (Admin only).
  router.delete(
    "/admin/services/:id",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const id = req.params.id;

        if (typeof id !== "string" || !ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid service ID.",
          });
        }

        const servicesCollection = getDB().collection("services");

        // Permanently remove the service from MongoDB.
        const result = await servicesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "Service was not found.",
          });
        }

        return res.status(200).json({
          success: true,
          message: "Service permanently deleted successfully.",
        });
      } catch (error) {
        console.error("Delete service error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to delete service.",
        });
      }
    }
  );


  // Helper: Convert category names into URL-friendly slugs.
  const createCategorySlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // Get all active categories (Public).
  router.get("/categories", async (req, res) => {
    try {
      const categories = await getDB()
        .collection("categories")
        .find({ isActive: true })
        .sort({ name: 1 })
        .toArray();

      return res.status(200).json({
        success: true,
        total: categories.length,
        categories,
      });
    } catch (error) {
      console.error("Get public categories error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch categories.",
      });
    }
  });

  // Get all categories (Admin only).
  router.get(
    "/admin/categories",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const categories = await getDB()
          .collection("categories")
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        return res.status(200).json({
          success: true,
          total: categories.length,
          categories,
        });
      } catch (error) {
        console.error("Get admin categories error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to fetch categories.",
        });
      }
    }
  );

  // Create a category (Admin only).
  router.post(
    "/admin/categories",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const { name, description, image } = req.body;

        if (
          typeof name !== "string" ||
          !name.trim() ||
          name.trim().length > 100
        ) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid category name.",
          });
        }

        if (
          description !== undefined &&
          (typeof description !== "string" ||
            description.trim().length > 500)
        ) {
          return res.status(400).json({
            success: false,
            message: "Category description cannot exceed 500 characters.",
          });
        }

        if (image !== undefined && image !== "") {
          if (typeof image !== "string") {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid category image URL.",
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
              message: "Category image must be a valid HTTPS URL.",
            });
          }
        }

        const categoriesCollection = getDB().collection("categories");
        const slug = createCategorySlug(name);

        if (!slug) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid category name.",
          });
        }

        const existingCategory = await categoriesCollection.findOne({
          slug,
        });

        if (existingCategory) {
          return res.status(409).json({
            success: false,
            message: "A category with this name already exists.",
          });
        }

        const now = new Date();

        const newCategory = {
          name: name.trim(),
          slug,
          description: description?.trim() || "",
          image: image?.trim() || "",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        const result = await categoriesCollection.insertOne(newCategory);

        return res.status(201).json({
          success: true,
          message: "Category created successfully.",
          category: {
            _id: result.insertedId,
            ...newCategory,
          },
        });
      } catch (error) {
        console.error("Create category error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to create category.",
        });
      }
    }
  );

  // Update a category (Admin only).
  router.patch(
    "/admin/categories/:id",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const id = req.params.id;

        if (typeof id !== "string" || !ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID.",
          });
        }

        const { name, description, image, isActive } = req.body;

        const categoriesCollection = getDB().collection("categories");

        const existingCategory = await categoriesCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!existingCategory) {
          return res.status(404).json({
            success: false,
            message: "Category not found.",
          });
        }

        const updates: {
          name?: string;
          slug?: string;
          description?: string;
          image?: string;
          isActive?: boolean;
          updatedAt?: Date;
        } = {};

        if (name !== undefined) {
          if (
            typeof name !== "string" ||
            !name.trim() ||
            name.trim().length > 100
          ) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid category name.",
            });
          }

          const newSlug = createCategorySlug(name);

          if (!newSlug) {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid category name.",
            });
          }

          const duplicate = await categoriesCollection.findOne({
            slug: newSlug,
            _id: { $ne: new ObjectId(id) },
          });

          if (duplicate) {
            return res.status(409).json({
              success: false,
              message: "Another category already uses this name.",
            });
          }

          updates.name = name.trim();
          updates.slug = newSlug;
        }

        if (description !== undefined) {
          if (
            typeof description !== "string" ||
            description.trim().length > 500
          ) {
            return res.status(400).json({
              success: false,
              message: "Category description cannot exceed 500 characters.",
            });
          }

          updates.description = description.trim();
        }

        if (image !== undefined) {
          if (typeof image !== "string") {
            return res.status(400).json({
              success: false,
              message: "Please provide a valid category image URL.",
            });
          }

          if (image.trim()) {
            try {
              const imageUrl = new URL(image);

              if (imageUrl.protocol !== "https:") {
                throw new Error("Invalid image URL");
              }
            } catch {
              return res.status(400).json({
                success: false,
                message: "Category image must be a valid HTTPS URL.",
              });
            }
          }

          updates.image = image.trim();
        }

        if (isActive !== undefined) {
          if (typeof isActive !== "boolean") {
            return res.status(400).json({
              success: false,
              message: "Category active status must be true or false.",
            });
          }

          updates.isActive = isActive;
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({
            success: false,
            message: "Please provide at least one field to update.",
          });
        }

        updates.updatedAt = new Date();

        await categoriesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );

        // Keep existing services connected if the category name changes.
        if (
          updates.name &&
          updates.name !== existingCategory.name
        ) {
          await getDB()
            .collection("services")
            .updateMany(
              { category: existingCategory.name },
              {
                $set: {
                  category: updates.name,
                  updatedAt: new Date(),
                },
              }
            );
        }

        const updatedCategory = await categoriesCollection.findOne({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,
          message: "Category updated successfully.",
          category: updatedCategory,
        });
      } catch (error) {
        console.error("Update category error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to update category.",
        });
      }
    }
  );

  // Delete a category (Admin only).
  router.delete(
    "/admin/categories/:id",
    requireAuth(auth),
    requireRole("admin"),
    async (req, res) => {
      try {
        const id = req.params.id;

        if (typeof id !== "string" || !ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID.",
          });
        }

        const categoriesCollection = getDB().collection("categories");

        const category = await categoriesCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!category) {
          return res.status(404).json({
            success: false,
            message: "Category not found.",
          });
        }

        const assignedServices = await getDB()
          .collection("services")
          .countDocuments({ category: category.name });

        if (assignedServices > 0) {
          return res.status(409).json({
            success: false,
            message:
              "This category cannot be deleted because services are assigned to it. Reassign or delete those services first.",
          });
        }

        await categoriesCollection.deleteOne({
          _id: new ObjectId(id),
        });

        return res.status(200).json({
          success: true,
          message: "Category deleted successfully.",
        });
      } catch (error) {
        console.error("Delete category error:", error);

        return res.status(500).json({
          success: false,
          message: "Failed to delete category.",
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

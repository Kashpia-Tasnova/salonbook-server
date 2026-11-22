
import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import type { createAuth } from "../lib/auth.js";

type AuthInstance = ReturnType<typeof createAuth>;

type ImageType = "profile" | "category" | "service";

// Configure Cloudinary using Render environment variables.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, WEBP, and AVIF images are allowed.")
      );
    }

    callback(null, true);
  },
});

// Upload an image buffer to Cloudinary.
const uploadToCloudinary = (
  buffer: Buffer,
  folder: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `salonbook/${folder}`,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result?.secure_url) {
          return reject(new Error("Cloudinary did not return an image URL."));
        }

        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
};

const uploadImage = async (
  req: import("express").Request,
  res: import("express").Response,
  imageType: ImageType
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image.",
      });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({
        success: false,
        message: "Image upload configuration is missing.",
      });
    }

    const imageUrl = await uploadToCloudinary(
      req.file.buffer,
      imageType
    );

    const imageTypeLabel =
      imageType === "category"
        ? "Category"
        : imageType === "service"
          ? "Service"
          : "Profile";

    return res.status(200).json({
      success: true,
      message: `${imageTypeLabel} image uploaded successfully.`,
      imageUrl,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);

    return res.status(502).json({
      success: false,
      message: "Failed to upload image. Please try another image.",
    });
  }
};

const createUploadRoutes = (auth: AuthInstance) => {
  const router = Router();

  // Profile image upload
  router.post(
    "/profile-image",
    upload.single("image"),
    async (req, res) => {
      return uploadImage(req, res, "profile");
    }
  );

  // Admin-only category image upload
  router.post(
    "/category-image",
    requireAuth(auth),
    requireRole("admin"),
    upload.single("image"),
    async (req, res) => {
      return uploadImage(req, res, "category");
    }
  );

  // Admin-only service image upload
  router.post(
    "/service-image",
    requireAuth(auth),
    requireRole("admin"),
    upload.single("image"),
    async (req, res) => {
      return uploadImage(req, res, "service");
    }
  );

  return router;
};

export default createUploadRoutes;


import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import type { createAuth } from "../lib/auth.js";

type AuthInstance = ReturnType<typeof createAuth>;

type ImageType = "profile" | "category" | "service";

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

    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Image upload configuration is missing.",
      });
    }

    // Use multipart FormData, just like StudioSpace.
    const formData = new FormData();

    const imageBlob = new Blob(
      [new Uint8Array(req.file.buffer)],
      { type: req.file.mimetype }
    );

    formData.append(
      "image",
      imageBlob,
      req.file.originalname
    );

    const response = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("ImgBB upload failed:", result);

      return res.status(502).json({
        success: false,
        message: "Failed to upload image. Please try another image.",
      });
    }

    const imageTypeLabel =
      imageType === "category"
        ? "Category"
        : imageType === "service"
          ? "Service"
          : "Profile";

    return res.status(200).json({
      success: true,
      message: `${imageTypeLabel} image uploaded successfully.`,
      imageUrl: result.data.url,
    });
  } catch (error) {
    console.error("Image upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong while uploading the image.",
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

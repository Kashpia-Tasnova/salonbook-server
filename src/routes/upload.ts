
import { Router } from "express";
import multer from "multer";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG, and WEBP images are allowed.")
      );
    }

    callback(null, true);
  },
});

router.post(
  "/profile-image",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a profile image.",
        });
      }

      const apiKey = process.env.IMGBB_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: "Image upload configuration is missing.",
        });
      }

      const base64Image = req.file.buffer.toString("base64");

      const formData = new URLSearchParams();
      formData.append("key", apiKey);
      formData.append("image", base64Image);

      const response = await fetch(
        "https://api.imgbb.com/1/upload",
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
          message: "Failed to upload profile image.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Profile image uploaded successfully.",
        imageUrl: result.data.url,
      });
    } catch (error) {
      console.error("Profile image upload error:", error);

      return res.status(500).json({
        success: false,
        message: "Something went wrong while uploading the image.",
      });
    }
  }
);

export default router;

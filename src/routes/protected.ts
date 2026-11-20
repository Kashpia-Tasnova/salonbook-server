
import { Router } from "express";
import type { createAuth } from "../lib/auth.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

type AuthInstance = ReturnType<typeof createAuth>;

const createProtectedRoutes = (auth: AuthInstance) => {
  const router = Router();

  // Only administrators can access this endpoint.
  router.get(
    "/admin",
    requireAuth(auth),
    requireRole("admin"),
    (req, res) => {
      res.status(200).json({
        success: true,
        message: "Admin access granted!",
      });
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

  return router;
};

export default createProtectedRoutes;

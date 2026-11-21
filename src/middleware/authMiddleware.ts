
import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { createAuth } from "../lib/auth.js";
import { getDB } from "../config/database.js";

type AuthInstance = ReturnType<typeof createAuth>;

export const requireAuth = (auth: AuthInstance): RequestHandler => {
  return async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          message: "Please sign in to access this resource.",
        });
      }

      // Check whether the authenticated account is blocked.
      const user = await getDB().collection("user").findOne(
        { email: session.user.email },
        { projection: { isBlocked: 1 } }
      );

      if (user?.isBlocked === true) {
        return res.status(403).json({
          success: false,
          blocked: true,
          message:
            "Your account has been blocked. Please contact the administrator.",
        });
      }

      res.locals.session = session;
      next();
    } catch (error) {
      console.error("Authentication error:", error);

      return res.status(401).json({
        success: false,
        message: "Authentication failed.",
      });
    }
  };
};

export const requireRole = (
  requiredRole: "admin" | "customer"
): RequestHandler => {
  return (req, res, next) => {
    const session = res.locals.session;

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const userRole = (
      session.user as typeof session.user & { role?: string }
    ).role;

    if (userRole !== requiredRole) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this resource.",
      });
    }

    next();
  };
};

// deno-lint-ignore-file no-explicit-any
import { FirebaseError } from "@firebase/app";
import "jsr:@std/dotenv/load";
import { AppConfig } from "./models.ts";
import { type User } from "@firebase/auth";
import { APP_ID_HEAD } from "./constants.ts";
import { fbAuth, getUserData } from "./db.ts";

// App configurations
const appConfigs = JSON.parse(Deno.env.get("APP_CONFIGS"));

export const apps: Record<string, AppConfig> = appConfigs;

export function handleFirebaseError(error: FirebaseError) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return { status: 409, message: "Email is already registered" };
    case "auth/invalid-email":
      return { status: 422, message: "Invalid email format" };
    case "auth/operation-not-allowed":
      return { status: 403, message: "Operation not allowed" };
    case "auth/weak-password":
      return { status: 422, message: "Password is too weak" };
    case "auth/user-disabled":
      return { status: 403, message: "Account has been disabled" };
    case "auth/user-not-found":
      return { status: 404, message: "User not found" };
    case "auth/wrong-password":
      return { status: 401, message: "Invalid credentials" };
    case "auth/invalid-credential":
      return { status: 401, message: "Invalid credentials" };
    case "auth/too-many-requests":
      return {
        status: 429,
        message: "Too many attempts. Please try again later",
      };
    case "auth/invalid-id-token":
      return { status: 401, message: "Invalid authentication token" };
    case "auth/id-token-expired":
      return { status: 401, message: "Authentication token expired" };
    default:
      return { status: 500, message: "An unexpected error occurred" };
  }
}

export const appIdMiddleware = () => {
  return async (c: any, next: any) => {
    const appId = c.req.header("X-App-Id");

    if (!appId || !apps[appId]) {
      return c.json({ error: "Invalid application ID" }, 401);
    }

    // Attach the validated appId to context
    c.set(APP_ID_HEAD, appId);

    await next();
  };
};

export const authMiddleware = () => {
  return async (c: any, next: any) => {
    await next();
  };
};

export function checkRoles(apps: {}, userRoles: []): boolean {
  return userRoles.every((role) => role in apps);
}

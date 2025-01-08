import { Hono } from "@hono/hono";
import { Client } from "pg";
import * as nodemailer from "nodemailer";
import { compare, hash } from "bcrypt";
import { getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";


// Nodemailer
const transporter = nodemailer.createTransport({
  service: Deno.env.get("EMAIL_APP_SERVICE"),
  auth: {
    user: Deno.env.get("EMAIL_APP_USER"),
    pass: Deno.env.get("EMAIL_APP_PASS"),
  },
});

// database client
const db = new Client({
  hostname: Deno.env.get("PG_HOSTNAME"),
  user: Deno.env.get("PG_USER"),
  password: Deno.env.get("PG_PASSWORD"),
  database: Deno.env.get("PG_DATABASE"),
  port: Deno.env.get("PG_PORT"),
});

await db.connect().then(() => {
  console.log("✅ Connexion to Postgres Successful");
}).catch((e) => {
  console.error(`❌ERROR When Connecting to Postgres ${e.message}`);
});

const JWT_EXPIRATION = Deno.env.get("JWT_EXPIRATION");

// Create Hono app instance
const auth = new Hono();

// Auth Routes
// Register
auth.post("/register", async (c) => {
  //TODO: to be implemented
  return c.json({ message: "User registered successfully" }, 201);
});

// Login
auth.post("/login", async (c) => {
  //TODO: to be implemented
  return c.json({ "token" }, 200);
});

// Forgot Password
auth.post("/forgot-password", async (c) => {
  //TODO: Implement rest of forgot password functionality
  return c.json({ message: "Password reset mail sent" }, 200);
});
// Reset Password
auth.post("/reset-password", async (c) => {
    //TODO: Implement rest of forgot password functionality
    return c.json({ message: "Password reset successfully" }, 200);
});

// Refresh Token
auth.post("/refresh-token", async (c) => {
    //TODO: Implement rest of forgot password functionality
    return c.json({ token: "newToken" }, 200);
});

// Delete Account
auth.delete("/delete-account", async (c) => {
    //TODO: Implement rest of forgot password functionality
    return c.json({ message: "User account deleted successfully" }, 200);
});

export { auth };

import { Hono } from "@hono/hono";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "@firebase/auth";
import "jsr:@std/dotenv/load";
import { cors } from "https://deno.land/x/hono/middleware.ts";
import {
  appIdMiddleware,
  apps,
  checkRoles,
  handleFirebaseError,
} from "../utils/auth-helpers.ts";
import { FirebaseError } from "@firebase/app";
import {
  checkWallet,
  fbAuth,
  getUserData,
  registerUser,
  setUserData,
  setWallet,
} from "../utils/db.ts";
import { APP_ID_HEAD, KV_USERS_KEY } from "../utils/constants.ts";

const auth = new Hono();

// Configure CORS
/*
const allowedOriginsSet = new Set(
  Object.values(apps).flatMap(app => app.allowedOrigins)
);
auth.use("/*", cors({
  origin: (origin) => allowedOriginsSet.has(origin) ? origin : "",
  credentials: true,
}));
*/

// Registration endpoint
auth.post("/register", appIdMiddleware(), async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json(
        { error: "Email, password, and appId required" },
        422,
      );
    }
    const appId = c.get(APP_ID_HEAD);

    // Set default role based on appId
    const roles = [appId];
    const userId = await registerUser(email, password);

    // Store user with roles
    await setUserData(email, { userId, roles });

    return c.json({
      message: "User registered successfully!",
      userId,
    });
  } catch (error) {
    if (error instanceof FirebaseError) {
      const { status, message } = handleFirebaseError(error);
      return c.json({ error: message }, status);
    }
    return c.json({ error: "Registration failed" }, 500);
  }
});

// Login endpoint
auth.post("/login", appIdMiddleware(), async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email, password required" }, 422);
    }

    const userData = await getUserData(email);
    if (!userData.value) {
      return c.json({ error: "User not found" }, 404);
    }

    // Verify user has access to this app

    const userRoles = userData.value.roles || [];

    if (!checkRoles(apps, userRoles)) {
      return c.json(
        { error: "Access to this application is not allowed" },
        403,
      );
    }

    const userCredential = await signInWithEmailAndPassword(
      fbAuth,
      email,
      password,
    );

    const token = await userCredential.user.getIdToken();
    return c.json({
      message: "Login successful",
      token,
      userId: userData.value.userId,
    });
  } catch (error) {
    if (error instanceof FirebaseError) {
      const { status, message } = handleFirebaseError(error);
      return c.json({ error: message }, status);
    }
    return c.json({ error: "Login failed" }, 500);
  }
});

// Password reset endpoint
auth.post("/reset-password", appIdMiddleware(), async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) {
      return c.json({ error: "Email is required" }, 422);
    }

    await sendPasswordResetEmail(fbAuth, email);
    return c.json({ message: "Password reset email sent!" });
  } catch (error) {
    if (error instanceof FirebaseError) {
      const { status, message } = handleFirebaseError(error);
      return c.json({ error: message }, status);
    }
    return c.json({ error: "Password reset failed" }, 500);
  }
});

// Link wallet endpoint
auth.post("/link-wallet", appIdMiddleware(), async (c) => {
  try {
    const { email, walletAddress } = await c.req.json();
    if (!email || !walletAddress) {
      return c.json({ error: "Email and wallet address required" }, 422);
    }

    const userData = await getUserData(email);

    if (!userData.value) {
      return c.json({ error: "User not found" }, 404);
    }

    // TODO: Gather and Verify Signature before setting wallet

    await setWallet(walletAddress, email);

    return c.json({ message: "User linked successfully!" });
  } catch (error) {
    return c.json({ error: "Failed to link wallet" }, 500);
  }
});

// CLI Login Page (Opens in Browser)
auth.get("/cli-portal", async (c) => {
  const state = c.req.query("state");

  if (!state) {
    return c.text("Missing state parameter", 400);
  }

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Kumulus CLI Authentication</title>
      </head>
      <body>
        <h1>Kumulus CLI Authentication</h1>
        <p>Please log in to authenticate your CLI session:</p>
        <form id="loginForm">
          <input type="hidden" id="state" value="${state}">
          
          <div>
            <label>Email: <input type="email" id="email" required></label>
          </div>
          <div>
            <label>Password: <input type="password" id="password" required></label>
          </div>
          <button type="submit">Login</button>
        </form>
        <p id="status"></p>
        <script>
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const state = document.getElementById('state').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const response = await fetch('/auth/cli-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state, email, password })
            });

            const data = await response.json();
            if (response.ok) {
              document.getElementById('status').textContent = "Success! You can close this window.";
              setTimeout(() => window.close(), 2000);
            } else {
              document.getElementById('status').textContent = data.error || "Authentication failed";
            }
          });
        </script>
      </body>
    </html>
  `);
});

// CLI Login API
auth.post("/cli-login", async (c) => {
  const { state, email, password } = await c.req.json();
  if (!state) return c.json({ error: "Missing state" }, 400);

  try {
    const userCredential = await signInWithEmailAndPassword(
      fbAuth,
      email,
      password,
    );
    const token = await userCredential.user.getIdToken();

    //await kv.set(["cli-auth", state], { token, expires_at: Date.now() + 3600 * 1000 });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Authentication failed" }, 500);
  }
});

// CLI Polling Endpoint
auth.get("/cli-token", async (c) => {
  const state = c.req.query("state");
  const session = await kv.get(["cli-auth", state]);
  console.log("trying to get the session : ", session);
  if (!session) return c.json({ error: "Not authenticated yet" }, 404);

  return c.json(session);
});

export { auth };

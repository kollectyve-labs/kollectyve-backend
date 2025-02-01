import { Hono } from "@hono/hono";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type User,
} from "@firebase/auth";
import { initializeApp, FirebaseError } from '@firebase/app';
import "jsr:@std/dotenv/load";
import { cors } from "https://deno.land/x/hono/middleware.ts";

// Type definitions for better type safety
interface UserData {
  userId: string;
  roles?: string[];
}

interface AppConfig {
  id: string;
  name: string;
  allowedOrigins: string[];
  redirectUrls: string[];
}

const firebaseConfig = {
  apiKey: Deno.env.get("FB_API_KEY"),
  authDomain: Deno.env.get("FB_AUTH_DOMAIN"),
  projectId: Deno.env.get("FB_PROJECT_ID"),
  appId: Deno.env.get("FB_APP_ID")
};

const firebaseApp = initializeApp(firebaseConfig);
const fbAuth = getAuth(firebaseApp);

const auth = new Hono();
const kv = await Deno.openKv();

function handleFirebaseError(error: FirebaseError) {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return { status: 409, message: 'Email is already registered' };
    case 'auth/invalid-email':
      return { status: 422, message: 'Invalid email format' };
    case 'auth/operation-not-allowed':
      return { status: 403, message: 'Operation not allowed' };
    case 'auth/weak-password':
      return { status: 422, message: 'Password is too weak' };
    case 'auth/user-disabled':
      return { status: 403, message: 'Account has been disabled' };
    case 'auth/user-not-found':
      return { status: 404, message: 'User not found' };
    case 'auth/wrong-password':
      return { status: 401, message: 'Invalid credentials' };
    case 'auth/invalid-credential':
      return { status: 401, message: 'Invalid credentials' };
    case 'auth/too-many-requests':
      return { status: 429, message: 'Too many attempts. Please try again later' };
    case 'auth/invalid-id-token':
      return { status: 401, message: 'Invalid authentication token' };
    case 'auth/id-token-expired':
      return { status: 401, message: 'Authentication token expired' };
    default:
      return { status: 500, message: 'An unexpected error occurred' };
  }
}

async function registerUser(
  email: string,
  password: string,
) {
  const userCredential = await createUserWithEmailAndPassword(
    fbAuth,
    email,
    password,
  );
  await sendEmailVerification(userCredential.user);

  const userId = userCredential.user.uid;
  const userData: UserData = { userId };

  await kv.set(["users", email], userData);

  return { userId };
}

// App configurations
const apps: Record<string, AppConfig> = {
  KUMULUS_PROVIDERS: {
    id: "kumulusprovs",
    name: "Kumulus Cloud Provider Console",
    allowedOrigins: [
      "https://kumulus-provider.kollectyve.network",
      "http://localhost:3000"
    ],
    redirectUrls: []
  },
  KUMULUS_DEVELOPERS: {
    id: "kumulusdevs",
    name: "Kumulus Cloud Developer Console",
    allowedOrigins: [
      "kumulus-developer.kollectyve.network",
      "http://localhost:3000"
    ],
    redirectUrls: []
  },
  RELAI: {
    id: "relai",
    name: "Relai Platform Console",
    allowedOrigins: [
      "relai.kollectyve.network",
      "http://localhost:3000"
    ],
    redirectUrls: []
  }
};

// Token verification function
async function verifyToken(token: string): Promise<User> {
  try {
    // Since Firebase Admin SDK is not available in the browser,
    // we'll need to validate the token on the client side
    const currentUser = fbAuth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }
    
    const currentToken = await currentUser.getIdToken();
    if (currentToken !== token) {
      throw new Error('Invalid token');
    }
    
    return currentUser;
  } catch (error) {
    throw new Error('Failed to verify token');
  }
}

// Auth middleware to check app-specific permissions
export const authMiddleware = (requiredRoles: string[] = []) => {
  return async (c: any, next: any) => {
    try {
      const appId = c.req.header("X-App-Id");
      if (!appId || !apps[appId]) {
        return c.json({ error: "Invalid application ID" }, 401);
      }

      const origin = c.req.header("Origin");
      if (origin && !apps[appId].allowedOrigins.includes(origin)) {
        return c.json({ error: "Invalid origin" }, 403);
      }

      const authHeader = c.req.header("Authorization");
      if (!authHeader) {
        return c.json({ error: "Missing Authorization header" }, 401);
      }

      const [bearer, token] = authHeader.split(" ");
      if (bearer !== "Bearer" || !token) {
        return c.json({ error: "Invalid Authorization format" }, 401);
      }

      try {
        const user = await verifyToken(token);
        const userData = await kv.get(["users", user.email!]);
        
        if (!userData.value) {
          return c.json({ error: "User not found" }, 404);
        }

        if (requiredRoles.length > 0) {
          const userRoles = userData.value.roles || [];
          const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
          if (!hasRequiredRole) {
            return c.json({ error: "Insufficient permissions" }, 403);
          }
        }

        c.set("user", { ...user, ...userData.value });
        c.set("appConfig", apps[appId]);
        
        await next();
      } catch (error) {
        return c.json({ error: "Invalid token" }, 401);
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      return c.json({ error: "Authentication failed" }, 401);
    }
  };
};

// Configure CORS
/*
auth.use("/*", cors({
  origin: (origin) => {
    const allAllowedOrigins = Object.values(apps)
      .flatMap(app => app.allowedOrigins);
    return allAllowedOrigins.includes(origin) ? origin : "";
  },
  credentials: true,
}));
*/

// Registration endpoint
auth.post("/register", async (c) => {
  try {
    const { email, password, appId } = await c.req.json();
    if (!email || !password || !appId) {
      return c.json(
        { error: "Email, password, and appId required" },
        422,
      );
    }

    if (!apps[appId]) {
      return c.json({ error: "Invalid application ID" }, 400);
    }

    // Set default role based on appId
    const roles = [apps[appId].id];
    const { userId } = await registerUser(email, password);
    
    // Store user with roles
    await kv.set(["users", email], { userId, roles });

    return c.json({ 
      message: "User registered successfully!", 
      userId,
      appName: apps[appId].name 
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
auth.post("/login", async (c) => {
  try {
    const { email, password, appId } = await c.req.json();
    if (!email || !password || !appId) {
      return c.json({ error: "Email, password, and appId required" }, 422);
    }

    if (!apps[appId]) {
      return c.json({ error: "Invalid application ID" }, 400);
    }

    const userData = await kv.get(["users", email]);
    if (!userData.value) {
      return c.json({ error: "User not found" }, 404);
    }

    // Verify user has access to this app
    const userRoles = userData.value.roles || [];
    if (!userRoles.includes(apps[appId].id)) {
      return c.json({ error: "Access to this application is not allowed" }, 403);
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
      appName: apps[appId].name
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
auth.post("/reset-password", async (c) => {
  try {
    const { email, appId } = await c.req.json();
    if (!email || !appId) {
      return c.json({ error: "Email and appId are required" }, 422);
    }

    if (!apps[appId]) {
      return c.json({ error: "Invalid application ID" }, 400);
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
auth.post("/link-wallet", authMiddleware(), async (c) => {
  try {
    const { email, walletAddress } = await c.req.json();
    if (!email || !walletAddress) {
      return c.json({ error: "Email and wallet address required" }, 422);
    }

    // Check if wallet is already linked
    const existingWallet = await kv.get(["wallets", walletAddress]);
    if (existingWallet.value) {
      return c.json({ error: "Wallet address is already linked to an account" }, 409);
    }

    const userData = await kv.get(["users", email]);
    if (!userData.value) {
      return c.json({ error: "User not found" }, 404);
    }

    await kv.set(["wallets", walletAddress], { userId: userData.value.userId, email });
    return c.json({ message: "User linked successfully!" });
  } catch (error) {
    return c.json({ error: "Failed to link wallet" }, 500);
  }
});

export { auth };
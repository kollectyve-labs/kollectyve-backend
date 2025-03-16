import type { HealthStat,  UserData } from "./models.ts";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
} from "@firebase/auth";
import { initializeApp } from "@firebase/app";
import "jsr:@std/dotenv/load";

import type { ProviderData } from "./models.ts";


const firebaseConfig = {
  apiKey: Deno.env.get("FB_API_KEY"),
  authDomain: Deno.env.get("FB_AUTH_DOMAIN"),
  projectId: Deno.env.get("FB_PROJECT_ID"),
  appId: Deno.env.get("FB_APP_ID"),
};

const firebaseApp = initializeApp(firebaseConfig);
const fbAuth = getAuth(firebaseApp);

// Register a User
export async function registerUser(
  email: string,
  password: string,
  appId?: string
) {
  const userCredential = await createUserWithEmailAndPassword(
    fbAuth,
    email,
    password,
  );
  //TODO: Extract appId and store user in appropriate KV DB
  await sendEmailVerification(userCredential.user);
  return userCredential.user.uid;
}

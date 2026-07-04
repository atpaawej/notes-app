import "server-only";

import {
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function createAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp();
}

export const firebaseAdmin = createAdminApp();
export const adminAuth: Auth = getAuth(firebaseAdmin);

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
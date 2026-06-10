import { createHmac, timingSafeEqual } from "crypto";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  adminCredentials,
} from "../../adminCredentials";

const ADMIN_SESSION_VALUE = "admin";

function signSessionValue(value: string) {
  return createHmac("sha256", adminCredentials.sessionSecret).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function credentialsAreValid(username: string, password: string) {
  return username === adminCredentials.username && password === adminCredentials.password;
}

export function createAdminSessionToken() {
  return `${ADMIN_SESSION_VALUE}.${signSessionValue(ADMIN_SESSION_VALUE)}`;
}

export function adminSessionIsValid(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [value, signature] = token.split(".");

  return value === ADMIN_SESSION_VALUE && safeEqual(signature ?? "", signSessionValue(value));
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export { ADMIN_SESSION_COOKIE };

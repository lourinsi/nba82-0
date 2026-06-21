import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  createAdminSessionToken,
  credentialsAreValid,
} from "../auth";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ admin: false, message: "Invalid login request." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!credentialsAreValid(username, password)) {
    return NextResponse.json({ admin: false, message: "Invalid username or password." }, { status: 401 });
  }

  const response = NextResponse.json({ admin: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminCookieOptions());

  return response;
}

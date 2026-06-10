import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "../auth";

export async function POST() {
  const response = NextResponse.json({ admin: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    maxAge: 0,
    path: "/",
  });

  return response;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, adminSessionIsValid } from "../auth";

export async function GET() {
  const cookieStore = await cookies();
  const admin = adminSessionIsValid(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return NextResponse.json({ admin });
}

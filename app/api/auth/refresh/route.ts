import { NextRequest } from "next/server";
import { verifyRefreshToken, signAccessToken } from "@/lib/jwt";
import { ok, unauthorized, serverError } from "@/lib/response";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("refresh_token")?.value;
    if (!token) return unauthorized();

    const payload = verifyRefreshToken(token);
    const accessToken = signAccessToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    });

    const response = ok({ refreshed: true });
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day — matches login
      path: "/",
    });
    response.cookies.set("user_role", payload.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day — matches access_token
      path: "/",
    });
    return response;
  } catch {
    return unauthorized("Refresh token expired");
  }
}

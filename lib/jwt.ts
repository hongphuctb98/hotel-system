import jwt from "jsonwebtoken";
import type { TokenPayload } from "@/types/auth.types";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "refresh-secret-change-me";

export function signAccessToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "1d" });
}

export function signRefreshToken(payload: Omit<TokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}

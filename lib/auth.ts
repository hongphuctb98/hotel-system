import { cookies } from "next/headers";
import { verifyAccessToken } from "./jwt";
import type { TokenPayload } from "@/types/auth.types";

export async function getAuthUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<TokenPayload> {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

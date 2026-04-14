import { NextResponse } from "next/server";
import type { ApiResponse, PaginationMeta } from "@/types/api.types";

export function ok<T>(data: T, meta?: PaginationMeta) {
  return NextResponse.json<ApiResponse<T>>({ success: true, data, meta });
}

export function created<T>(data: T) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status: 201 }
  );
}

export function badRequest(error: string, code?: string) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error, code },
    { status: 400 }
  );
}

export function unauthorized(error = "Unauthorized") {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    { status: 401 }
  );
}

export function forbidden(error = "Forbidden") {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    { status: 403 }
  );
}

export function notFound(error = "Not found") {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    { status: 404 }
  );
}

export function conflict<T = never>(error: string, code?: string, data?: T) {
  return NextResponse.json<ApiResponse<T>>(
    { success: false, error, code, data },
    { status: 409 }
  );
}

export function serverError(error: unknown) {
  console.error("[API Error]", error);
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error: "Internal server error" },
    { status: 500 }
  );
}

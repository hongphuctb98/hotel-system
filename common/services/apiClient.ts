import type { ApiResponse } from "@/types/api.types";

export class ApiError extends Error {
  code?: string;
  data?: unknown;

  constructor(message: string, code?: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.data = data;
  }
}

const BASE_URL =
  typeof window !== "undefined"
    ? ""
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  skipContentType = false
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = skipContentType
    ? {}
    : { "Content-Type": "application/json" };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
    credentials: "include",
  });

  if (res.status === 401) {
    // Attempt token refresh
    const refreshed = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!refreshed.ok) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expired");
    }
    return request<T>(endpoint, options, skipContentType);
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new ApiError(json.error ?? "Request failed", json.code, json.data);
  return json;
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: "DELETE",
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  upload: <T>(url: string, formData: FormData) =>
    request<T>(url, { method: "POST", body: formData }, true),
};

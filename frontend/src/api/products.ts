import type { Product, ProductInput } from "../types";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

interface ApiErrorBody {
  error?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readApiError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return body?.error ?? `Request failed with status ${response.status}`;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new ApiError(await readApiError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listProducts(): Promise<Product[]> {
  return request<Product[]>("/api/products");
}

export function getProduct(id: string): Promise<Product> {
  return request<Product>(`/api/products/${id}`);
}

export function createProduct(input: ProductInput): Promise<Product> {
  return request<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateProduct(id: string, input: ProductInput): Promise<Product> {
  return request<Product>(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export function deleteProduct(id: string): Promise<void> {
  return request<void>(`/api/products/${id}`, {
    method: "DELETE"
  });
}

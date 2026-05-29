import type {
  BackendItemInput,
  BackendItemPreview,
  BackendItemRecord,
  BackendProjectInput,
  BackendProjectRecord,
} from "../types/backend";

export const apiBaseUrl = import.meta.env.DEV ? "" : import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
let csrfToken: string | null = null;

function resolveApiUrl(path: string) {
  if (!apiBaseUrl) return path;
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiUrl(path: string) {
  return resolveApiUrl(path);
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const method = (options.method ?? "GET").toUpperCase();

  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (csrfToken && MUTATING_METHODS.has(method) && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string | { _errors?: string[] } };
    if (typeof data.error === "string") return data.error;
    if (data.error && typeof data.error === "object" && Array.isArray(data.error._errors) && data.error._errors[0]) {
      return data.error._errors[0];
    }
  } catch {
    // Ignore malformed error bodies.
  }

  return `Request failed with status ${response.status}`;
}

export function stripHtml(value?: string) {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function toPreview(project: BackendItemRecord): BackendItemPreview {
  return {
    title: project.title,
    slug: project.slug,
    thumbnail: project.thumbnail ?? "",
    description: stripHtml(project.description),
    demoUrl: project.demoUrl,
  };
}

export async function listItems() {
  return request<BackendItemRecord[]>("/api/items");
}

export async function listProjects() {
  return request<BackendProjectRecord[]>("/api/items");
}

export async function getItem(slug: string) {
  return request<BackendItemRecord>(`/api/items/${slug}`);
}

export async function getProject(slug: string) {
  return request<BackendProjectRecord>(`/api/items/${slug}`);
}

export async function createItem(input: BackendItemInput) {
  return request<BackendItemRecord>("/api/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createProject(input: BackendProjectInput) {
  return request<BackendProjectRecord>("/api/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateItem(slug: string, input: BackendItemInput) {
  return request<BackendItemRecord>(`/api/items/${slug}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function updateProject(slug: string, input: BackendProjectInput) {
  return request<BackendProjectRecord>(`/api/items/${slug}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function patchItem(slug: string, input: Partial<BackendItemInput>) {
  return request<BackendItemRecord>(`/api/items/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function patchProject(slug: string, input: Partial<BackendProjectInput>) {
  return request<BackendProjectRecord>(`/api/items/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteItem(slug: string) {
  await request<void>(`/api/items/${slug}`, {
    method: "DELETE",
  });
}

export async function deleteProject(slug: string) {
  await request<void>(`/api/items/${slug}`, {
    method: "DELETE",
  });
}

export async function listUploads() {
  return request<Array<{ filename: string; url: string }>>("/api/uploads");
}

export async function deleteUpload(filename: string) {
  await request<void>(`/api/uploads/${encodeURIComponent(filename)}`, { method: "DELETE" });
}

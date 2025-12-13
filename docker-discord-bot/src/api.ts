import { config } from "./config";
import type { ApiResponse, CreateServerRequest, GameServer } from "./types";

const headers: Record<string, string> = {
  "Content-Type": "application/json",
};

if (config.ELYSIA_API_KEY) {
  headers["Authorization"] = `Bearer ${config.ELYSIA_API_KEY}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${config.ELYSIA_API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: error || `HTTP ${response.status}` };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const api = {
  listServers: () => request<GameServer[]>("GET", "/api/game-servers"),

  getServer: (name: string) =>
    request<GameServer>("GET", `/api/game-servers/${encodeURIComponent(name)}`),

  createServer: (req: CreateServerRequest) =>
    request<GameServer>("POST", "/api/game-servers", req),

  startServer: (name: string) =>
    request<GameServer>("POST", `/api/game-servers/${encodeURIComponent(name)}/start`),

  stopServer: (name: string) =>
    request<GameServer>("POST", `/api/game-servers/${encodeURIComponent(name)}/stop`),

  deleteServer: (name: string) =>
    request<void>("DELETE", `/api/game-servers/${encodeURIComponent(name)}`),

  health: () => request<{ status: string }>("GET", "/health"),
};

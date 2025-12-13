export const config = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID!,
  ELYSIA_API_URL: process.env.ELYSIA_API_URL || "http://localhost:3000",
  ELYSIA_API_KEY: process.env.ELYSIA_API_KEY,
} as const;

const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"] as const;

for (const key of required) {
  if (!config[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

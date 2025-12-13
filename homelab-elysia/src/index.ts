import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { config } from "./infra/config";
import { publicRoutes } from "./routes/public";
import { privateRoutes } from "./routes/private";
import { internalRoutes } from "./routes/internal";

const app = new Elysia()
  .use(
    openapi({
      documentation: {
        info: {
          title: "Homelab Elysia API",
          version: "1.0.0",
          description: "Central API for homelab automation",
        },
        tags: [
          { name: "Health", description: "Health and status endpoints" },
          { name: "Game Servers", description: "Minecraft server management" },
          { name: "Internal", description: "Internal K8s endpoints" },
        ],
      },
    })
  )
  .use(publicRoutes)
  .use(privateRoutes)
  .use(internalRoutes)
  .onError(({ code, error, set }) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${code}] ${message}`);

    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "Validation failed", details: message };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return { error: "Not found" };
    }

    set.status = 500;
    return { error: "Internal server error" };
  })
  .listen(config.PORT);

console.log(
  `Homelab Elysia running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log(`OpenAPI docs at http://${app.server?.hostname}:${app.server?.port}/openapi`);

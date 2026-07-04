import { createApp } from "./app";
import { loadConfig } from "./config";
import { createHealthCheck } from "./db/health";
import { runMigrations } from "./db/migrate";
import { createPool } from "./db/pool";
import { createRedis } from "./db/redis";
import { createPostgresProductRepository } from "./repositories/products";

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  const redis = createRedis(config.redisUrl);

  await runMigrations(pool);

  const app = createApp({
    productRepository: createPostgresProductRepository(pool),
    cache: redis,
    healthCheck: createHealthCheck(pool, redis),
    frontendOrigin: config.frontendOrigin,
    enableLogging: config.nodeEnv !== "test"
  });

  const server = app.listen(config.port, () => {
    console.log(`Products API listening on port ${config.port}`);
  });

  async function shutdown(): Promise<void> {
    server.close(async () => {
      await Promise.all([pool.end(), redis.quit()]);
      process.exit(0);
    });
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`Startup failed: ${message}`);
  process.exit(1);
});

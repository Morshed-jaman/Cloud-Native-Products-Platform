import cors from "cors";
import express from "express";
import morgan from "morgan";
import { AppError } from "./errors";
import { errorHandler } from "./middleware/errorHandler";
import { createProductsRouter } from "./routes/products";
import type { CacheClient, HealthCheck, ProductRepository } from "./types";

export interface AppDependencies {
  productRepository: ProductRepository;
  cache: CacheClient;
  healthCheck: HealthCheck;
  frontendOrigin?: string;
  enableLogging?: boolean;
}

export function createApp({
  productRepository,
  cache,
  healthCheck,
  frontendOrigin = "http://localhost:3000",
  enableLogging = true
}: AppDependencies): express.Express {
  const app = express();

  if (enableLogging) {
    app.use(morgan("combined"));
  }

  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    const [postgresResult, redisResult] = await Promise.allSettled([
      healthCheck.checkPostgres(),
      healthCheck.checkRedis()
    ]);

    const postgres = postgresResult.status === "fulfilled" && postgresResult.value;
    const redis = redisResult.status === "fulfilled" && redisResult.value;
    const healthy = postgres && redis;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "error",
      postgres,
      redis
    });
  });

  app.use("/api/products", createProductsRouter(productRepository, cache));

  app.use((_req, _res, next) => {
    next(new AppError(404, "Route not found"));
  });

  app.use(errorHandler);

  return app;
}

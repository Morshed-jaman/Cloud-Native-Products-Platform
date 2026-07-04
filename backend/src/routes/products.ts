import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError, NotFoundError } from "../errors";
import type { CacheClient, ProductRepository } from "../types";

const ALL_PRODUCTS_CACHE_KEY = "products:all";
const PRODUCTS_CACHE_TTL_SECONDS = 30;

const createProductSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    price: z.number().positive("Price must be greater than 0")
  })
  .strict();

const updateProductSchema = createProductSchema.partial();

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(route: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction): void => {
    route(req, res, next).catch(next);
  };
}

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ");
    throw new AppError(400, message || "Invalid request body");
  }

  return result.data;
}

async function invalidateProductsCache(cache: CacheClient): Promise<void> {
  await cache.del(ALL_PRODUCTS_CACHE_KEY);
}

export function createProductsRouter(repository: ProductRepository, cache: CacheClient): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const cachedProducts = await cache.get(ALL_PRODUCTS_CACHE_KEY);

      if (cachedProducts) {
        res.json(JSON.parse(cachedProducts));
        return;
      }

      const products = await repository.list();
      await cache.set(
        ALL_PRODUCTS_CACHE_KEY,
        JSON.stringify(products),
        "EX",
        PRODUCTS_CACHE_TTL_SECONDS
      );
      res.json(products);
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const product = await repository.findById(req.params.id);

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      res.json(product);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const input = parseBody(createProductSchema, req.body);
      const product = await repository.create(input);
      await invalidateProductsCache(cache);
      res.status(201).json(product);
    })
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const input = parseBody(updateProductSchema, req.body);
      const product = await repository.update(req.params.id, input);

      if (!product) {
        throw new NotFoundError("Product not found");
      }

      await invalidateProductsCache(cache);
      res.json(product);
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const wasDeleted = await repository.delete(req.params.id);

      if (!wasDeleted) {
        throw new NotFoundError("Product not found");
      }

      await invalidateProductsCache(cache);
      res.status(204).send();
    })
  );

  return router;
}

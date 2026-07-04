import type Redis from "ioredis";
import type { Pool } from "pg";
import type { HealthCheck } from "../types";

export function createHealthCheck(pool: Pool, redis: Redis): HealthCheck {
  return {
    async checkPostgres(): Promise<boolean> {
      try {
        await pool.query("SELECT 1");
        return true;
      } catch {
        return false;
      }
    },

    async checkRedis(): Promise<boolean> {
      try {
        return (await redis.ping()) === "PONG";
      } catch {
        return false;
      }
    }
  };
}

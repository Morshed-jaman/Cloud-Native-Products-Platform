export interface AppConfig {
  port: number;
  databaseUrl: string;
  redisUrl: string;
  nodeEnv: string;
  frontendOrigin: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function loadConfig(): AppConfig {
  const port = Number(process.env.PORT ?? 4000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return {
    port,
    databaseUrl: requireEnv("DATABASE_URL"),
    redisUrl: requireEnv("REDIS_URL"),
    nodeEnv: process.env.NODE_ENV ?? "development",
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"
  };
}

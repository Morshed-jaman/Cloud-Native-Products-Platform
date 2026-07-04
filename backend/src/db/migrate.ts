import { promises as fs } from "fs";
import path from "path";
import type { Pool } from "pg";

export async function runMigrations(
  pool: Pick<Pool, "query">,
  migrationsDir = path.resolve(__dirname, "../../migrations")
): Promise<void> {
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }
}

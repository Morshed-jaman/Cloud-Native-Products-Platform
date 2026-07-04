import type { Pool } from "pg";
import type { NewProductInput, Product, ProductRepository, UpdateProductInput } from "../types";

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

const productColumns = `
  id,
  name,
  description,
  price::float8 AS price,
  created_at,
  updated_at
`;

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  };
}

export function createPostgresProductRepository(pool: Pool): ProductRepository {
  return {
    async list(): Promise<Product[]> {
      const result = await pool.query<ProductRow>(
        `SELECT ${productColumns} FROM products ORDER BY created_at DESC`
      );

      return result.rows.map(mapProduct);
    },

    async findById(id: string): Promise<Product | null> {
      const result = await pool.query<ProductRow>(
        `SELECT ${productColumns} FROM products WHERE id = $1`,
        [id]
      );

      return result.rows[0] ? mapProduct(result.rows[0]) : null;
    },

    async create(input: NewProductInput): Promise<Product> {
      const result = await pool.query<ProductRow>(
        `INSERT INTO products (name, description, price)
         VALUES ($1, $2, $3)
         RETURNING ${productColumns}`,
        [input.name, input.description ?? null, input.price]
      );

      return mapProduct(result.rows[0]);
    },

    async update(id: string, input: UpdateProductInput): Promise<Product | null> {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (input.name !== undefined) {
        values.push(input.name);
        fields.push(`name = $${values.length}`);
      }

      if (input.description !== undefined) {
        values.push(input.description);
        fields.push(`description = $${values.length}`);
      }

      if (input.price !== undefined) {
        values.push(input.price);
        fields.push(`price = $${values.length}`);
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      values.push(id);

      const result = await pool.query<ProductRow>(
        `UPDATE products
         SET ${fields.join(", ")}
         WHERE id = $${values.length}
         RETURNING ${productColumns}`,
        values
      );

      return result.rows[0] ? mapProduct(result.rows[0]) : null;
    },

    async delete(id: string): Promise<boolean> {
      const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);
      return (result.rowCount ?? 0) > 0;
    }
  };
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface NewProductInput {
  name: string;
  description?: string;
  price: number;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
}

export interface ProductRepository {
  list(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  create(input: NewProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttlSeconds: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface HealthCheck {
  checkPostgres(): Promise<boolean>;
  checkRedis(): Promise<boolean>;
}

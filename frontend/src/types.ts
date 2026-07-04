export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  price: number;
}

export type SortOption = "name" | "price-asc" | "price-desc";

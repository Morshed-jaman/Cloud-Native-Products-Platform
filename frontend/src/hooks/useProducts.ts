import { useCallback, useEffect, useState } from "react";
import {
  createProduct as createProductRequest,
  deleteProduct as deleteProductRequest,
  listProducts,
  updateProduct as updateProductRequest
} from "../api/products";
import type { Product, ProductInput } from "../types";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await listProducts();
      setProducts(data);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Unable to load products"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const createProduct = useCallback(async (input: ProductInput) => {
    const createdProduct = await createProductRequest(input);
    setProducts((currentProducts) => [createdProduct, ...currentProducts]);
    return createdProduct;
  }, []);

  const updateProduct = useCallback(async (id: string, input: ProductInput) => {
    const updatedProduct = await updateProductRequest(id, input);
    setProducts((currentProducts) =>
      currentProducts.map((product) => (product.id === id ? updatedProduct : product))
    );
    return updatedProduct;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await deleteProductRequest(id);
    setProducts((currentProducts) => currentProducts.filter((product) => product.id !== id));
  }, []);

  return {
    products,
    loading,
    error,
    retry: fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct
  };
}

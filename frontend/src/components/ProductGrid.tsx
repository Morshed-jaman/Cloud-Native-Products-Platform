import type { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { SkeletonCard } from "./SkeletonCard";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductGrid({ products, loading, onEdit, onDelete }: ProductGridProps) {
  if (loading) {
    return (
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading products">
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </section>
    );
  }

  return (
    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Product list">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </section>
  );
}

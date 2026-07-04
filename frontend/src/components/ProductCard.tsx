import { Pencil, Package, Trash2 } from "lucide-react";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function formatCurrency(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(price);
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <article className="dashboard-panel group flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-zinc-800 dark:text-zinc-300 dark:group-hover:bg-indigo-500/10 dark:group-hover:text-indigo-300">
            <Package className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-lg font-bold text-slate-950 dark:text-white">{product.name}</h3>
            <p className="mt-1 text-xs font-medium uppercase text-slate-400 dark:text-zinc-500">
              Product ID {product.id.slice(0, 8)}
            </p>
          </div>
        </div>
        <p className="flex-none rounded-xl bg-indigo-50 px-3 py-2 text-sm font-extrabold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
          {formatCurrency(product.price)}
        </p>
      </div>

      <p className="mt-5 min-h-12 flex-1 text-sm leading-6 text-slate-600 dark:text-zinc-400">
        {product.description?.trim() || "No description provided."}
      </p>

      <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800">
        <button
          type="button"
          className="icon-button"
          onClick={() => onEdit(product)}
          aria-label={`Edit ${product.name}`}
          title={`Edit ${product.name}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-600 shadow-sm transition duration-200 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-zinc-950 dark:text-rose-300 dark:hover:bg-rose-500/10"
          onClick={() => onDelete(product)}
          aria-label={`Delete ${product.name}`}
          title={`Delete ${product.name}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

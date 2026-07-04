import { PackagePlus } from "lucide-react";

interface EmptyStateProps {
  filtered: boolean;
  onAddProduct: () => void;
}

export function EmptyState({ filtered, onAddProduct }: EmptyStateProps) {
  return (
    <section className="dashboard-panel grid min-h-96 place-items-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          <PackagePlus className="h-11 w-11" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-slate-950 dark:text-white">
          {filtered ? "No matching products" : "No products yet"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">
          {filtered
            ? "Try a different search term or clear the search to see your full catalog."
            : "No products yet - add your first one!"}
        </p>
        {!filtered ? (
          <button
            type="button"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
            onClick={onAddProduct}
          >
            Add your first product
          </button>
        ) : null}
      </div>
    </section>
  );
}

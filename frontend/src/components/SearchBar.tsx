import { ArrowUpDown, Plus, Search } from "lucide-react";
import type { SortOption } from "../types";

interface SearchBarProps {
  query: string;
  sort: SortOption;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
  onAddProduct: () => void;
}

export function SearchBar({
  query,
  sort,
  onQueryChange,
  onSortChange,
  onAddProduct
}: SearchBarProps) {
  return (
    <section className="dashboard-panel p-4 sm:p-5" aria-label="Product search and sorting">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="relative block">
          <span className="sr-only">Search products</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            className="control-input pl-12"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by product name"
            type="search"
          />
        </label>

        <label className="relative block">
          <span className="sr-only">Sort products</span>
          <ArrowUpDown
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <select
            className="control-input appearance-none pl-12"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
          >
            <option value="name">Name</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition duration-200 hover:bg-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30"
          onClick={onAddProduct}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add Product
        </button>
      </div>
    </section>
  );
}

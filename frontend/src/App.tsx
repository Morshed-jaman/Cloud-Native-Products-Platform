import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { AlertCircle, PackageSearch } from "lucide-react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { EmptyState } from "./components/EmptyState";
import { Navbar } from "./components/Navbar";
import { ProductGrid } from "./components/ProductGrid";
import { ProductModal } from "./components/ProductModal";
import { SearchBar } from "./components/SearchBar";
import { useProducts } from "./hooks/useProducts";
import type { Product, ProductInput, SortOption } from "./types";

type ModalState =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; product: Product };

const themeStorageKey = "products-studio-theme";

function getInitialDarkMode(): boolean {
  const storedTheme = window.localStorage.getItem(themeStorageKey);

  if (storedTheme === "dark") {
    return true;
  }

  if (storedTheme === "light") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function App() {
  const {
    products,
    loading,
    error,
    retry,
    createProduct,
    updateProduct,
    deleteProduct
  } = useProducts();

  const [darkMode, setDarkMode] = useState(getInitialDarkMode);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("name");
  const [modalState, setModalState] = useState<ModalState>({ type: "closed" });
  const [deleteCandidate, setDeleteCandidate] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem(themeStorageKey, darkMode ? "dark" : "light");
  }, [darkMode]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredProducts = normalizedQuery
      ? products.filter((product) => product.name.toLowerCase().includes(normalizedQuery))
      : products;

    return [...filteredProducts].sort((left, right) => {
      if (sort === "price-asc") {
        return left.price - right.price;
      }

      if (sort === "price-desc") {
        return right.price - left.price;
      }

      return left.name.localeCompare(right.name);
    });
  }, [products, query, sort]);

  const editingProduct = modalState.type === "edit" ? modalState.product : null;
  const modalOpen = modalState.type !== "closed";

  async function handleProductSubmit(input: ProductInput): Promise<void> {
    setSubmitting(true);

    try {
      if (modalState.type === "edit") {
        await updateProduct(modalState.product.id, input);
        toast.success("Product updated");
      } else {
        await createProduct(input);
        toast.success("Product created");
      }

      setModalState({ type: "closed" });
    } catch (submitError) {
      const message = getErrorMessage(submitError, "Unable to save product");
      toast.error(message);
      throw submitError;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deleteCandidate) {
      return;
    }

    setDeleting(true);

    try {
      await deleteProduct(deleteCandidate.id);
      toast.success("Product deleted");
      setDeleteCandidate(null);
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Unable to delete product"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgb(224_231_255_/_0.55),transparent_32rem)] transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top_left,rgb(49_46_129_/_0.20),transparent_34rem)]">
      <Navbar darkMode={darkMode} onToggleTheme={() => setDarkMode((current) => !current)} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3200,
          style: {
            borderRadius: "12px",
            boxShadow: "0 18px 45px rgb(15 23 42 / 0.12)"
          }
        }}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-indigo-600 dark:text-indigo-300">
              Product operations
            </p>
            <h1 className="mt-3 text-4xl font-extrabold text-slate-950 sm:text-5xl dark:text-white">
              Manage your catalog with clarity.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-zinc-400">
              Search, sort, add, edit, and remove products from a polished workspace that stays fast
              across every screen size.
            </p>
          </div>

          <div className="dashboard-panel p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <PackageSearch className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-950 dark:text-white">{products.length}</p>
                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Products tracked</p>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mb-5 flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
              <div>
                <p className="font-bold">Unable to load products</p>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
            <button
              type="button"
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
              onClick={() => void retry()}
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="space-y-5">
          <SearchBar
            query={query}
            sort={sort}
            onQueryChange={setQuery}
            onSortChange={setSort}
            onAddProduct={() => setModalState({ type: "create" })}
          />

          {!loading && visibleProducts.length === 0 ? (
            <EmptyState filtered={products.length > 0} onAddProduct={() => setModalState({ type: "create" })} />
          ) : (
            <ProductGrid
              products={visibleProducts}
              loading={loading}
              onEdit={(product) => setModalState({ type: "edit", product })}
              onDelete={setDeleteCandidate}
            />
          )}
        </div>
      </main>

      <ProductModal
        open={modalOpen}
        product={editingProduct}
        submitting={submitting}
        onClose={() => setModalState({ type: "closed" })}
        onSubmit={handleProductSubmit}
      />

      <ConfirmDialog
        open={deleteCandidate !== null}
        title="Are you sure?"
        description={
          deleteCandidate
            ? `This will permanently delete "${deleteCandidate.name}" from your catalog.`
            : ""
        }
        confirmLabel="Delete product"
        loading={deleting}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

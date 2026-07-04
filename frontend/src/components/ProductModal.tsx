import { FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Product, ProductInput } from "../types";

interface ProductModalProps {
  open: boolean;
  product: Product | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<void>;
}

interface ProductFormState {
  name: string;
  description: string;
  price: string;
}

interface ProductFormErrors {
  name?: string;
  price?: string;
}

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  price: ""
};

export function ProductModal({ open, product, submitting, onClose, onSubmit }: ProductModalProps) {
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});

  const title = useMemo(() => (product ? "Edit product" : "Add product"), [product]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      product
        ? {
            name: product.name,
            description: product.description ?? "",
            price: String(product.price)
          }
        : emptyForm
    );
    setErrors({});
  }, [open, product]);

  if (!open) {
    return null;
  }

  function validate(): ProductFormErrors {
    const nextErrors: ProductFormErrors = {};
    const price = Number(form.price);

    if (!form.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!Number.isFinite(price) || price <= 0) {
      nextErrors.price = "Price must be greater than 0.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price)
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl transition-colors dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-zinc-800">
          <div>
            <h2 id="product-modal-title" className="text-xl font-bold text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              Keep product details crisp and pricing accurate.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close product modal"
            title="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="space-y-5 px-6 py-6" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Name</span>
            <input
              className="control-input mt-2"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Wireless keyboard"
            />
            {errors.name ? <span className="mt-2 block text-sm font-medium text-rose-600">{errors.name}</span> : null}
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Description</span>
            <textarea
              className="control-input mt-2 min-h-28 resize-y"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Short product summary"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Price</span>
            <input
              className="control-input mt-2"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              placeholder="29.99"
            />
            {errors.price ? <span className="mt-2 block text-sm font-medium text-rose-600">{errors.price}</span> : null}
          </label>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : product ? "Save changes" : "Create product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

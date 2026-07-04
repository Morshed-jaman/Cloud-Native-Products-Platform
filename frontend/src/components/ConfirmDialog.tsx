import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">{description}</p>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => void onConfirm()}
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

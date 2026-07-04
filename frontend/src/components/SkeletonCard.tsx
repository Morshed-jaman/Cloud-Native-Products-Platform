export function SkeletonCard() {
  return (
    <article className="dashboard-panel animate-pulse p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-4 w-36 rounded bg-slate-200 dark:bg-zinc-800" />
          <div className="h-3 w-52 rounded bg-slate-100 dark:bg-zinc-800/80" />
        </div>
        <div className="h-10 w-20 rounded-xl bg-indigo-100 dark:bg-indigo-500/15" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="h-3 w-full rounded bg-slate-100 dark:bg-zinc-800/80" />
        <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-zinc-800/80" />
      </div>
      <div className="mt-6 flex gap-2">
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800" />
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-zinc-800" />
      </div>
    </article>
  );
}

import { Moon, PackageCheck, Sun } from "lucide-react";

interface NavbarProps {
  darkMode: boolean;
  onToggleTheme: () => void;
}

export function Navbar({ darkMode, onToggleTheme }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-colors duration-300 dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
            <PackageCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-950 dark:text-white">Products Studio</p>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Inventory workspace</p>
          </div>
        </div>

        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>
      </nav>
    </header>
  );
}

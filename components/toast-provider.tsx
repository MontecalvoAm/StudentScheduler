"use client";

import { useUIStore } from "@/stores/ui-store";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

export function ToastProvider() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0">
      {toasts.map((toast) => {
        const Icon = {
          success: CheckCircle2,
          error: AlertCircle,
          warning: AlertTriangle,
          info: Info,
        }[toast.type];

        const colors = {
          success: "border-emerald-500/20 bg-emerald-950/80 text-emerald-200",
          error: "border-rose-500/20 bg-rose-950/80 text-rose-200",
          warning: "border-amber-500/20 bg-amber-950/80 text-amber-200",
          info: "border-indigo-500/20 bg-indigo-950/80 text-indigo-200",
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${colors}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{toast.title}</h3>
              {toast.message && (
                <p className="text-xs opacity-80 mt-1">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

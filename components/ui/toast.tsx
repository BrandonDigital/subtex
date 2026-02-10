"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "warning" | "info" | "loading"

interface Toast {
  id: string
  message: string
  type: ToastType
  description?: string
  image?: string
}

interface ToastOptions {
  description?: string
  image?: string
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, options?: ToastOptions) => string
  removeToast: (id: string) => void
  success: (message: string, options?: ToastOptions) => string
  error: (message: string, options?: ToastOptions) => string
  warning: (message: string, options?: ToastOptions) => string
  info: (message: string, options?: ToastOptions) => string
  loading: (message: string, options?: ToastOptions) => string
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

const icons: Record<ToastType, ReactNode> = {
  success: <CircleCheckIcon className="size-4 text-emerald-500" />,
  error: <OctagonXIcon className="size-4 text-red-500" />,
  warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
  info: <InfoIcon className="size-4 text-blue-500" />,
  loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      className={cn(
        "group pointer-events-auto relative flex w-full cursor-pointer items-center gap-3 rounded-md border bg-popover p-4 pr-10 text-popover-foreground shadow-lg transition-all",
        "animate-in slide-in-from-bottom fade-in-0",
        "hover:bg-accent/50"
      )}
    >
      {toast.image ? (
        <div className="shrink-0 relative size-10 rounded overflow-hidden border bg-muted">
          <Image
            src={toast.image}
            alt=""
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      ) : (
        <div className="shrink-0">{icons[toast.type]}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
        )}
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
        <XIcon className="size-4" />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = "info", options?: ToastOptions) => {
      const id = Math.random().toString(36).substring(2, 9)
      const toast: Toast = { id, message, type, description: options?.description, image: options?.image }

      setToasts((prev) => [...prev, toast])

      // Auto-dismiss after 4 seconds (except loading toasts)
      if (type !== "loading") {
        setTimeout(() => {
          removeToast(id)
        }, 4000)
      }

      return id
    },
    [removeToast]
  )

  const success = useCallback(
    (message: string, options?: ToastOptions) => addToast(message, "success", options),
    [addToast]
  )

  const error = useCallback(
    (message: string, options?: ToastOptions) => addToast(message, "error", options),
    [addToast]
  )

  const warning = useCallback(
    (message: string, options?: ToastOptions) => addToast(message, "warning", options),
    [addToast]
  )

  const info = useCallback(
    (message: string, options?: ToastOptions) => addToast(message, "info", options),
    [addToast]
  )

  const loading = useCallback(
    (message: string, options?: ToastOptions) => addToast(message, "loading", options),
    [addToast]
  )

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, warning, info, loading }}
    >
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Standalone toast function for use outside of React components
let toastFn: ToastContextType | null = null

export function ToastBridge() {
  const context = useToast()
  
  // Set the context reference for standalone toast calls
  if (toastFn !== context) {
    toastFn = context
  }
  
  return null
}

export const toast = Object.assign(
  (message: string, options?: ToastOptions) => 
    toastFn?.info(message, options),
  {
    success: (message: string, options?: ToastOptions) => 
      toastFn?.success(message, options),
    error: (message: string, options?: ToastOptions) => 
      toastFn?.error(message, options),
    warning: (message: string, options?: ToastOptions) => 
      toastFn?.warning(message, options),
    info: (message: string, options?: ToastOptions) => 
      toastFn?.info(message, options),
    loading: (message: string, options?: ToastOptions) => 
      toastFn?.loading(message, options),
    dismiss: (id: string) => toastFn?.removeToast(id),
  }
)

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { ToastContext } from '../hooks/toastContext'

const toastStyles = {
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle,
  },
  error: {
    container: 'border-rose-200 bg-rose-50 text-rose-800',
    icon: XCircle,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertTriangle,
  },
  info: {
    container: 'border-blue-200 bg-blue-50 text-blue-800',
    icon: Info,
  },
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, visible: false } : toast,
      ),
    )
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 250)
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    const id = crypto.randomUUID()
    const normalizedType = toastStyles[type] ? type : 'info'

    setToasts((current) => [
      ...current,
      { id, message, type: normalizedType, visible: false },
    ])

    window.setTimeout(() => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, visible: true } : toast,
        ),
      )
    }, 10)

    return id
  }, [])

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const style = toastStyles[toast.type] || toastStyles.info
  const Icon = style.icon

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(toast.id)
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [onDismiss, toast.id])

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg transition duration-300 ease-out ${
        style.container
      } ${toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="rounded p-0.5 opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default ToastProvider

import { toast } from 'react-hot-toast'

interface ShowActionToastParams {
  message: string
  actionLabel: string
  onAction(): void
}

export function showActionToast({
  message,
  actionLabel,
  onAction,
}: ShowActionToastParams) {
  toast.custom((toastInstance) => (
    <div className="max-w-sm rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-lg flex items-center justify-between gap-3">
      <span className="text-sm text-gray-800">{message}</span>

      <button
        type="button"
        className="text-xs font-medium text-teal-900 hover:text-teal-700"
        onClick={() => {
          onAction()
          toast.dismiss(toastInstance.id)
        }}
      >
        {actionLabel}
      </button>
    </div>
  ))
}
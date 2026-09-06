import { useEffect, useRef } from 'react'
import Spinner from './Spinner.jsx'

/**
 * Reusable confirmation dialog for destructive actions (delete lead
 * today; more later). Dependency-free: overlay + dialog card + busy
 * state. Renders nothing while closed.
 *
 * Accessibility:
 *  - role="dialog", aria-modal, labelled + described by title/description
 *  - ESC and backdrop-click close it (ignored while a request is in
 *    flight, so a busy dialog cannot be dismissed mid-delete)
 *  - initial focus lands on Cancel — the non-destructive action
 *  - minimal focus trap (launch a11y polish): Tab / Shift+Tab cycle
 *    within the dialog, so keyboard users cannot tab into the page
 *    behind the overlay — without pulling in a focus-trap dependency
 *
 * While isBusy is true, both buttons are disabled — a double-click can
 * never fire two delete requests.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  error = null,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isBusy = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null)

  // Keyboard handling. Registered unconditionally to keep hook order
  // stable; the callback only runs when open && !isBusy.
  useEffect(() => {
    if (!open || isBusy) return
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCancel()
        return
      }
      // Minimal focus trap: Tab wraps at the dialog's focusable edges.
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        const inside = dialogRef.current.contains(active)
        if (event.shiftKey && (!inside || active === first)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (!inside || active === last)) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, isBusy, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={isBusy ? undefined : onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold text-slate-900"
        >
          {title}
        </h2>
        {description && (
          <p
            id="confirm-dialog-description"
            className="mt-2 text-sm text-slate-600"
          >
            {description}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            autoFocus
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBusy && <Spinner />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

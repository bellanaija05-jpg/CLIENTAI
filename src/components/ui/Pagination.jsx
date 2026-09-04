/**
 * Generic, minimal client-side pagination control.
 *
 * Displays a "Showing A–B of N" range plus Previous/Next buttons, and a
 * "Page X of Y" indicator. Real <button>s (keyboard accessible by
 * default) with clear aria-labels. Previous/Next are disabled at the
 * ends so navigation can't leave the valid range.
 *
 * Props:
 *  - currentPage : 1-based
 *  - totalPages  : number of pages (>= 1)
 *  - onPrevious  : go to previous page
 *  - onNext      : go to next page
 *  - totalItems  : total items in the dataset (for the "Showing" text)
 *  - pageSize    : items per page
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  totalItems,
  pageSize,
}) {
  if (totalPages <= 1) return null

  const firstIndex = (currentPage - 1) * pageSize + 1
  const lastIndex = Math.min(currentPage * pageSize, totalItems)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <p className="text-sm text-slate-500">
        Showing {firstIndex}–{lastIndex} of {totalItems}{' '}
        {totalItems === 1 ? 'lead' : 'leads'}
      </p>

      <div className="flex items-center gap-3">
        <p className="text-sm text-slate-500">Page {currentPage} of {totalPages}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </nav>
  )
}
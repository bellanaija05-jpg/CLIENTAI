/**
 * Shared empty-state block: icon + title + short description.
 * Pure presentation — no data fetching, no state. Used wherever a
 * legitimately empty list needs a friendly explanation (leads today;
 * follow-ups, activities, and search results later).
 */
export default function EmptyState({ icon = '📋', title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="text-4xl" aria-hidden="true">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  )
}

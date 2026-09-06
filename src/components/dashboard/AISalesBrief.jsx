import { useState } from 'react'
import { generateSalesBrief } from '../../data/ai.js'
import Spinner from '../ui/Spinner.jsx'
import PanelError from './PanelError.jsx'

/**
 * AI Daily Sales Brief (Phase 8 Stage 4).
 *
 * A compact assistant briefing on the Dashboard: the deterministic
 * intelligence engine decides WHAT matters (priority, ranking, reasons,
 * next actions — all computed in the page via lib/leadIntelligence.js);
 * the AI only SUMMARIZES those already-computed facts into 2–4 natural
 * sentences. It never ranks, never scores, and never invents facts —
 * the prompt on the server enforces that, and this component renders
 * exactly the text that comes back.
 *
 * Generation is ALWAYS user-triggered ("Generate Brief" / "Refresh
 * Brief") — never on render, never in an effect — so the feature costs
 * one AI request per explicit click and nothing otherwise.
 *
 * States:
 *   no meaningful signals → deterministic "all caught up" message, no AI call
 *   idle                  → short explainer + Generate Brief button
 *   loading               → "Preparing your sales brief…" (button disabled)
 *   error                 → compact error + retry (dashboard keeps working)
 *   brief                 → the text (aria-live polite) + Refresh Brief
 *
 * The context prop is built once per render by the page from data it
 * already has — no requests happen in this component.
 */
export default function AISalesBrief({ context, hasSignals }) {
  const [brief, setBrief] = useState(null) // null = no brief generated yet
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const text = await generateSalesBrief(context)
      setBrief(text)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  // Honest empty state: nothing worth briefing today. Deterministic —
  // no AI request is spent producing an "all caught up" message.
  if (!hasSignals) {
    return (
      <section
        aria-label="AI sales brief"
        className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-800">AI Sales Brief</h2>
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-sm font-medium text-emerald-800">
            You&rsquo;re all caught up. No urgent sales actions are currently
            identified.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="AI sales brief"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            AI Sales Brief
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            A quick AI summary of today&rsquo;s sales situation, based on your
            CRM data.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          {isGenerating && <Spinner />}
          {isGenerating
            ? 'Preparing…'
            : brief === null
              ? 'Generate Brief'
              : 'Refresh Brief'}
        </button>
      </div>

      {/* aria-live so a freshly generated (or regenerated) brief is
          announced without stealing focus. */}
      <div aria-live="polite" className="mt-4">
        {isGenerating && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Spinner />
            Preparing your sales brief…
          </p>
        )}

        {!isGenerating && error && (
          <PanelError
            message="Couldn&rsquo;t generate your sales brief. Try again."
            onRetry={handleGenerate}
          />
        )}

        {!isGenerating && !error && brief !== null && (
          <p className="text-sm leading-6 text-slate-700">{brief}</p>
        )}
      </div>
    </section>
  )
}

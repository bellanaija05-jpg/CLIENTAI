import { useEffect, useRef, useState } from 'react'
import { generateFollowUp } from '../../data/ai.js'
import { AI_INTENTS, DEFAULT_AI_INTENT } from '../../lib/schemas.js'
import Spinner from '../ui/Spinner.jsx'

/**
 * AI Follow-Up Generator (Phase 5).
 *
 * A self-contained section on Lead Details: pick an intent, generate a
 * personalized draft from the lead's real CRM context, review it, edit
 * it, copy it, or generate another version. The AI call happens in the
 * generate-follow-up Edge Function (server-side API key, RLS-checked
 * lead ownership) — this component only renders what comes back.
 *
 * The user is always in control: nothing is ever sent or saved beyond
 * the generation history record; the draft is simply text in an editor.
 */
export default function AiFollowUpGenerator({ leadId }) {
  const [intent, setIntent] = useState(DEFAULT_AI_INTENT)
  const [draft, setDraft] = useState(null) // null = no draft yet
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef(null)

  // Clear the "Copied!" timer on unmount so it can't fire afterwards.
  useEffect(() => {
    return () => clearTimeout(copyTimer.current)
  }, [])

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    setCopied(false)
    try {
      const text = await generateFollowUp(leadId, intent)
      setDraft(text)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleCopy() {
    navigator.clipboard
      .writeText(draft ?? '')
      .then(() => {
        setCopied(true)
        clearTimeout(copyTimer.current)
        copyTimer.current = setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        setError(
          'Could not access the clipboard. Select the text and copy it manually.',
        )
      })
  }

  function handleDiscard() {
    setDraft(null)
    setError(null)
    setCopied(false)
  }

  const hasDraft = typeof draft === 'string'

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          AI Follow-Up
        </h2>
        <p className="text-xs text-slate-400">
          Generated from this lead&rsquo;s CRM context — review before using.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {!hasDraft ? (
        <>
          <fieldset className="mt-4" disabled={isGenerating}>
            <legend className="text-sm font-medium text-slate-700">
              What kind of follow-up?
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {AI_INTENTS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer flex-col gap-1 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 has-checked:border-brand-500 has-checked:bg-brand-50"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <input
                      type="radio"
                      name="ai-follow-up-intent"
                      value={option.value}
                      checked={intent === option.value}
                      onChange={() => setIntent(option.value)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {option.label}
                  </span>
                  <span className="text-xs leading-5 text-slate-500">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {isGenerating && <Spinner />}
              {isGenerating ? 'Generating…' : 'Generate AI Follow-Up'}
            </button>
          </div>
        </>
      ) : (
        <>
          <label htmlFor="ai-follow-up-draft" className="sr-only">
            Generated follow-up message (editable)
          </label>
          <textarea
            id="ai-follow-up-draft"
            rows={8}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setCopied(false)
            }}
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleDiscard}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              Discard draft
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={copied || draft.trim() === ''}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {copied ? 'Copied ✓' : 'Copy message'}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {isGenerating && <Spinner />}
              {isGenerating ? 'Generating…' : 'Generate another version'}
            </button>
          </div>

          {copied && (
            <p role="status" className="mt-2 text-right text-xs text-emerald-700">
              The message is on your clipboard.
            </p>
          )}
        </>
      )}
    </section>
  )
}

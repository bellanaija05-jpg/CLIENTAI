// Maps a next-action kind (from the engine's computeNextAction) to the
// Lead Details route + query that opens the matching existing workflow.
// Shared by the dashboard panels (Today's Sales Focus + Today's Sales
// Work) so every panel hands the user off through the SAME routes — one
// navigation map, not one per panel.
//
// This is purely a navigation handoff — the intelligence logic itself
// lives in lib/leadIntelligence.js; these maps only translate its
// recommendation into a URL.
//
// The Lead Details page reads `?section=` to scroll/focus and open the
// existing inline forms (Activities, Follow-Ups, AI generator).
export const ACTION_ROUTES = {
  'view-follow-ups': (leadId) => `/leads/${leadId}?section=follow-ups`,
  'add-follow-up': (leadId) => `/leads/${leadId}?section=follow-ups`,
  'add-activity': (leadId) => `/leads/${leadId}?section=activities`,
  'generate-ai': (leadId) => `/leads/${leadId}?section=ai`,
}

// The primary action verb shown on the item's button. Falls back to the
// engine's own label for any action kind without a specific route.
export const ACTION_LABELS = {
  'view-follow-ups': 'View Follow-Ups',
  'add-follow-up': 'Add Follow-Up',
  'add-activity': 'Add Activity',
  'generate-ai': 'Generate Follow-Up',
}

// Stage 5 (action layer): the handoff must be immediately obvious — a
// real primary button, not a plain text link. Both dashboard panels
// (Today's Sales Focus + Today's Sales Work) share this one style so the
// app has ONE visual language for "this is the action to take now". It
// mirrors the existing brand-600 solid button used across the app
// (LeadInsights, LeadQuickActions, AI generator).
export const ACTION_BUTTON_CLASSES =
  'shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600'
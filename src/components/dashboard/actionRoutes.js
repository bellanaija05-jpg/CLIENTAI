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
/** Static help articles — keyed for HelpTopicScreen. */

export type HelpTopicId =
  | 'trips'
  | 'account_app'
  | 'payments'
  | 'guides'
  | 'lost_items'
  | 'incomplete_relocation'
  | 'safety'
  | 'accessibility'
  | 'legal'
  | 'privacy'
  | 'diagnostics'
  | 'map_issues';

export const HELP_TOPICS: {
  id: HelpTopicId;
  title: string;
  summary: string;
}[] = [
  { id: 'trips', title: 'Trips', summary: 'Create, accept, track, and complete relocations.' },
  { id: 'account_app', title: 'Account & app', summary: 'Profile, role mode, settings, and sign-in.' },
  { id: 'payments', title: 'Payments', summary: 'Payouts, methods, and trip pricing.' },
  { id: 'guides', title: 'Guides', summary: 'How KeyGo works for owners and drivers.' },
  { id: 'lost_items', title: 'Lost items', summary: 'If something is left in a vehicle.' },
  { id: 'incomplete_relocation', title: 'Incomplete relocation', summary: 'When a trip cannot be finished as planned.' },
  { id: 'safety', title: 'Safety', summary: 'PIN, TripCheck, follow-along, and reporting.' },
  { id: 'accessibility', title: 'Accessibility', summary: 'Motion, text, and display preferences.' },
  { id: 'legal', title: 'Legal', summary: 'Terms, policies, and liability overview.' },
  { id: 'privacy', title: 'Privacy', summary: 'Data use, visibility, and controls.' },
  { id: 'diagnostics', title: 'Diagnostics', summary: 'Logs, connectivity, and troubleshooting.' },
  { id: 'map_issues', title: 'Map issues', summary: 'Location accuracy and navigation apps.' },
];

export const HELP_ARTICLES: Record<HelpTopicId, { title: string; body: string }> = {
  trips: {
    title: 'Trips',
    body:
      'Owners post relocations with pickup and drop-off details. Drivers browse available work and accept trips that fit their schedule.\n\nUse My Trips to see status, chat with the other party, and complete the handoff. If something changes, message in-app before redirecting outside KeyGo.',
  },
  account_app: {
    title: 'Account & app',
    body:
      'One email can switch between Owner and Driver in Profile → Role mode. Update your photo, documents, and preferences from Profile.\n\nSettings holds account, privacy, and general options. Safety and Help are always available from the top chips.',
  },
  payments: {
    title: 'Payments',
    body:
      'Payment amounts are agreed as part of each trip. Payout methods and history live under Profile → Money → Payments.\n\nTax-related helpers are under Tax info. For disputes, contact support via Help → Inbox.',
  },
  guides: {
    title: 'Guides',
    body:
      'KeyGo is vehicle relocation: owners need keys moved; drivers relocate the car from A to B.\n\nRead Tips & info in Profile for best practices and check Safety for trust tools.',
  },
  lost_items: {
    title: 'Lost items',
    body:
      'If something is left in a vehicle after a trip, message the other party in chat first. If unresolved, open Help → Inbox and describe the item and trip — we will help coordinate.\n\nKeyGo does not insure personal belongings inside the car; use discretion when storing items.',
  },
  incomplete_relocation: {
    title: 'Incomplete relocation',
    body:
      'If weather, mechanical issues, or safety stops a trip early, mark the situation in the trip flow and notify the other party in chat.\n\nSupport can review edge cases when you write from Help → Inbox with the trip ID.',
  },
  safety: {
    title: 'Safety',
    body:
      'Use PIN verification and TripCheck from Profile → Safety. Share “Follow my trip” only with people you trust.\n\nMeet in public places for handoffs and report concerns through Inbox.',
  },
  accessibility: {
    title: 'Accessibility',
    body:
      'Reduce motion, bold text hints, and night mode live under Settings. The app respects your system text size where possible.\n\nIf something is hard to use, tell us via Inbox → Accessibility in the message.',
  },
  legal: {
    title: 'Legal',
    body:
      'KeyGo provides a marketplace-style connection between independent owners and drivers. You are responsible for compliance with local laws and insurance.\n\nFull legal documents will be linked here as they are published for your region.',
  },
  privacy: {
    title: 'Privacy',
    body:
      'Control profile visibility and analytics under Settings → Privacy. Address and communication preferences are stored to run trips and notifications.\n\nWe do not sell personal data; details follow our privacy policy.',
  },
  diagnostics: {
    title: 'Diagnostics',
    body:
      'If the app misbehaves: force-close and reopen, check network, and confirm EXPO_PUBLIC_API_URL in your build.\n\nNote the time and screen; send details through Help → Inbox so we can investigate.',
  },
  map_issues: {
    title: 'Map issues',
    body:
      'Choose a preferred maps app under Settings → Navigation. If GPS drifts, toggle location permissions and try again outdoors.\n\nTrip routes are indicative — follow road rules and your insurer’s guidance.',
  },
};

export function isHelpTopicId(id: string): id is HelpTopicId {
  return id in HELP_ARTICLES;
}

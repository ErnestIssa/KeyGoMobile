/** User-facing copy for Role mode (Owner ↔ Driver). Server enforces authorization. */

export const ROLE_CONFIRM_OWNER = [
  'You are about to switch this account to Owner mode.',
  'You will post relocations, set pickup and drop-off, pricing, and vehicle details. Drivers will see your listings when they browse available work.',
  'The app, tabs, and trip tools will change to the owner experience. You can switch back to Driver mode anytime from Profile.',
].join('\n\n');

export const ROLE_CONFIRM_DRIVER = [
  'You are about to switch this account to Driver mode.',
  'You will browse available relocations, accept trips you can complete, and mark work finished so owners get paid. You will not create new trip listings while in this mode.',
  'The app, tabs, and trip tools will change to the driver experience. You can switch back to Owner mode anytime from Profile.',
].join('\n\n');

export const ROLE_INFO_OWNER_TITLE = 'Owner mode';
export const ROLE_INFO_OWNER_BODY = [
  'What it is',
  'Owner mode is for people who need a vehicle moved from one place to another. You create trips, describe the car, set fair payment, and track status until completion.',
  '',
  'What you can do',
  '• Post new relocation requests with locations and vehicle details.',
  '• See your own trips (pending, accepted, completed).',
  '• Confirm when a driver has finished the job so the workflow closes cleanly.',
  '',
  'Expectations',
  'Provide accurate pickup/drop-off information and reachable contact details. Respond when a driver accepts your trip. Meet agreed handoff rules safely and in public when possible.',
  '',
  'Responsibilities',
  'You are responsible for the accuracy of listings and for coordinating handover of keys and vehicle access. Misleading or unsafe arrangements may affect your account standing.',
  '',
  'Switching modes',
  'Your account stays the same email and password; only the active mode changes. You can switch to Driver mode to accept others’ trips without signing out.',
].join('\n');

export const ROLE_INFO_DRIVER_TITLE = 'Driver mode';
export const ROLE_INFO_DRIVER_BODY = [
  'What it is',
  'Driver mode is for people who perform relocations: you pick up vehicles and deliver them to the destination the owner specified.',
  '',
  'What you can do',
  '• Browse trips that are open for acceptance.',
  '• Accept trips you intend to complete.',
  '• Update trip status with the owner through the app’s flow.',
  '',
  'Expectations',
  'Only accept trips you can realistically complete. Communicate delays, follow traffic laws, and treat the vehicle with care. The platform may require verification or approval for certain actions.',
  '',
  'Responsibilities',
  'You are responsible for safe operation and honest status updates. No-shows or repeated issues can affect eligibility for future trips.',
  '',
  'Switching modes',
  'Your account stays the same email and password; only the active mode changes. You can switch to Owner mode to list your own relocations without signing out.',
].join('\n');

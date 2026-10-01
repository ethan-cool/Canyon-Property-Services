// Site settings — edit these, no other code changes needed.
window.SITE_CONFIG = {
  // Paste your Google Apps Script web app URL here (see README.md).
  // Until it's set, the form runs in preview mode and doesn't send anything.
  BOOKING_ENDPOINT: '',

  // Shown in the header, booking section and footer. Leave '' to hide.
  PHONE: '',
  EMAIL: '',

  // Must match the settings at the top of apps-script/Code.gs.
  BOOKING_DAYS_AHEAD: 60,
  WORK_DAYS: [1, 2, 3, 4, 5, 6] // 0 = Sunday … 6 = Saturday
};

/**
 * Canyon Property Services — booking backend
 *
 * A Google Apps Script web app that receives booking requests from the
 * website and puts them straight onto your Google Calendar.
 *
 *   doGet  -> returns which date/time windows are already taken, so the
 *             website can grey them out before a client picks one.
 *   doPost -> validates the request, double-checks the slot is still open,
 *             creates the calendar event, and emails you + the client.
 *
 * Setup steps are in README.md ("Connect the booking form").
 */

// ---------------------------------------------------------------------------
// Settings — edit these
// ---------------------------------------------------------------------------

// 'primary' = the main calendar of the Google account that deploys this script.
// To use a separate calendar, paste its Calendar ID here
// (Google Calendar > Settings > [calendar] > Integrate calendar > Calendar ID).
var CALENDAR_ID = 'primary';

// Where new-booking alerts go. Leave '' to use the deploying account's email.
var OWNER_EMAIL = '';

var BUSINESS_NAME = 'Canyon Property Services';
var TIMEZONE = 'America/Denver';

// Arrival windows offered on the website (24h clock, Mountain Time).
// Keys must match the values used by the website form.
var WINDOWS = {
  morning:   { label: 'Morning (8–11 AM)',   start: 8,  end: 11 },
  midday:    { label: 'Midday (11 AM–2 PM)', start: 11, end: 14 },
  afternoon: { label: 'Afternoon (2–5 PM)',  start: 14, end: 17 }
};

// How many jobs you can take in one window before it shows as full.
var JOBS_PER_WINDOW = 1;

// How far ahead clients can book, and which weekdays you work (0 = Sunday).
var BOOKING_DAYS_AHEAD = 60;
var WORK_DAYS = [1, 2, 3, 4, 5, 6];

// Only events whose title starts with this count toward "full" windows,
// so your personal appointments don't block bookings. Set to '' to make
// ANY event on the calendar block that window.
var BOOKING_TAG = '🍂';

// ---------------------------------------------------------------------------

function doGet() {
  return json_({ ok: true, taken: getTakenSlots_() });
}

function doPost(e) {
  var p = (e && e.parameter) || {};

  // Spam honeypot: real people never fill this hidden field.
  if (p.company_website) return json_({ ok: true });

  var missing = ['name', 'phone', 'email', 'address', 'city', 'date', 'window']
    .filter(function (k) { return !String(p[k] || '').trim(); });
  if (missing.length) {
    return json_({ ok: false, error: 'Please fill in: ' + missing.join(', ') });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
    return json_({ ok: false, error: 'That email address doesn’t look right.' });
  }
  var win = WINDOWS[p.window];
  if (!win) return json_({ ok: false, error: 'Please choose an arrival window.' });

  var day = parseDate_(p.date);
  if (!day) return json_({ ok: false, error: 'Please choose a valid date.' });
  if (!isBookableDay_(day)) {
    return json_({ ok: false, error: 'That date isn’t available. Please pick another day.' });
  }

  var start = atHour_(day, win.start);
  var end = atHour_(day, win.end);

  // Lock so two people submitting at the same moment can't double-book.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var cal = getCalendar_();
    if (countBookings_(cal.getEvents(start, end)) >= JOBS_PER_WINDOW) {
      return json_({
        ok: false,
        error: 'Sorry — that window was just booked. Please pick another time.',
        taken: getTakenSlots_()
      });
    }

    var services = [].concat(e.parameters && e.parameters.services || p.services || []);
    var title = BOOKING_TAG + ' Leaf Cleanup – ' + clean_(p.name) + ' (' + clean_(p.city) + ')';
    var description = [
      'NEW BOOKING REQUEST (from website)',
      '',
      'Name: ' + clean_(p.name),
      'Phone: ' + clean_(p.phone),
      'Email: ' + clean_(p.email),
      'Prefers contact by: ' + clean_(p.contact_pref || 'Either'),
      '',
      'Address: ' + clean_(p.address) + ', ' + clean_(p.city) + ', CO',
      'Property size: ' + clean_(p.property_size || 'Not specified'),
      'Services: ' + (services.length ? services.map(clean_).join(', ') : 'Not specified'),
      'Frequency: ' + clean_(p.frequency || 'One-time'),
      'Arrival window: ' + win.label,
      '',
      'Notes: ' + clean_(p.notes || '—'),
      '',
      'Submitted: ' + Utilities.formatDate(new Date(), TIMEZONE, 'EEE MMM d, yyyy h:mm a')
    ].join('\n');

    var event = cal.createEvent(title, start, end, {
      description: description,
      location: clean_(p.address) + ', ' + clean_(p.city) + ', CO'
    });
    event.setColor(CalendarApp.EventColor.ORANGE);
    event.addPopupReminder(60 * 12);

    notifyOwner_(title, description);
    confirmClient_(p, win, day);
  } finally {
    lock.releaseLock();
  }

  return json_({ ok: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCalendar_() {
  var cal = CALENDAR_ID === 'primary'
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) throw new Error('Calendar not found — check CALENDAR_ID.');
  return cal;
}

function countBookings_(events) {
  return events.filter(function (ev) {
    return !BOOKING_TAG || ev.getTitle().indexOf(BOOKING_TAG) === 0;
  }).length;
}

/** { 'YYYY-MM-DD': ['morning', ...] } for every full window in the booking range. */
function getTakenSlots_() {
  var cal = getCalendar_();
  var from = startOfToday_();
  var to = new Date(from.getTime() + (BOOKING_DAYS_AHEAD + 1) * 864e5);
  var events = cal.getEvents(from, to);
  var taken = {};

  for (var d = new Date(from); d < to; d = new Date(d.getTime() + 864e5)) {
    var key = Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
    Object.keys(WINDOWS).forEach(function (name) {
      var ws = atHour_(d, WINDOWS[name].start);
      var we = atHour_(d, WINDOWS[name].end);
      var overlapping = events.filter(function (ev) {
        return ev.getStartTime() < we && ev.getEndTime() > ws;
      });
      if (countBookings_(overlapping) >= JOBS_PER_WINDOW) {
        (taken[key] = taken[key] || []).push(name);
      }
    });
  }
  return taken;
}

function notifyOwner_(title, description) {
  var to = OWNER_EMAIL || Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(to, 'New booking: ' + title.replace(BOOKING_TAG, '').trim(),
    description + '\n\nIt’s already on your Google Calendar.');
}

function confirmClient_(p, win, day) {
  var when = Utilities.formatDate(day, TIMEZONE, 'EEEE, MMMM d');
  MailApp.sendEmail({
    to: p.email,
    replyTo: OWNER_EMAIL || Session.getEffectiveUser().getEmail(),
    name: BUSINESS_NAME,
    subject: 'We got your leaf cleanup request – ' + when,
    body: [
      'Hi ' + clean_(p.name).split(' ')[0] + ',',
      '',
      'Thanks for booking with ' + BUSINESS_NAME + '! Here’s what we have:',
      '',
      '  Date: ' + when,
      '  Arrival: ' + win.label,
      '  Address: ' + clean_(p.address) + ', ' + clean_(p.city),
      '',
      'We’ll reach out shortly to confirm the details and give you a quote.',
      'Need to change anything? Just reply to this email.',
      '',
      '— ' + BUSINESS_NAME
    ].join('\n')
  });
}

function isBookableDay_(day) {
  var today = startOfToday_();
  var diff = Math.round((day - today) / 864e5);
  var weekday = Number(Utilities.formatDate(day, TIMEZONE, 'u')) % 7; // 'u': 1=Mon..7=Sun
  return diff >= 1 && diff <= BOOKING_DAYS_AHEAD && WORK_DAYS.indexOf(weekday) !== -1;
}

/** Parse 'YYYY-MM-DD' as midnight Mountain Time. */
function parseDate_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  var d = Utilities.parseDate(s + ' 00:00', TIMEZONE, 'yyyy-MM-dd HH:mm');
  return isNaN(d) ? null : d;
}

function atHour_(day, hour) {
  var ymd = Utilities.formatDate(day, TIMEZONE, 'yyyy-MM-dd');
  return Utilities.parseDate(ymd + ' ' + hour + ':00', TIMEZONE, 'yyyy-MM-dd H:mm');
}

function startOfToday_() {
  return parseDate_(Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd'));
}

function clean_(s) {
  return String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 1000);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run this once from the editor to grant permissions and test your setup. */
function testSetup() {
  Logger.log('Calendar: ' + getCalendar_().getName());
  Logger.log('Taken slots: ' + JSON.stringify(getTakenSlots_()));
}

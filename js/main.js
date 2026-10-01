(function () {
  'use strict';

  var cfg = window.SITE_CONFIG || {};
  var endpoint = (cfg.BOOKING_ENDPOINT || '').trim();
  var daysAhead = cfg.BOOKING_DAYS_AHEAD || 60;
  var workDays = cfg.WORK_DAYS || [1, 2, 3, 4, 5, 6];
  var WINDOW_LABELS = { morning: 'Morning (8–11 AM)', midday: 'Midday (11 AM–2 PM)', afternoon: 'Afternoon (2–5 PM)' };
  var ALL_WINDOWS = Object.keys(WINDOW_LABELS);

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ---------- Contact details + footer year ----------
  document.getElementById('year').textContent = new Date().getFullYear();
  if (cfg.PHONE || cfg.EMAIL) {
    $$('[data-contact]').forEach(function (el) { el.hidden = false; });
    $$('[data-phone]').forEach(function (a) {
      if (cfg.PHONE) { a.textContent = cfg.PHONE; a.href = 'tel:' + cfg.PHONE.replace(/[^\d+]/g, ''); } else a.remove();
    });
    $$('[data-email]').forEach(function (a) {
      if (cfg.EMAIL) { a.textContent = cfg.EMAIL; a.href = 'mailto:' + cfg.EMAIL; } else a.remove();
    });
    if (!(cfg.PHONE && cfg.EMAIL)) $$('[data-sep]').forEach(function (s) { s.remove(); });
  }

  // ---------- Falling leaves ----------
  var leafBox = $('.leaves');
  var LEAF_COLORS = ['#f2b705', '#e07b0c', '#d9541e', '#f5c518', '#a8431c'];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function dropLeaf() {
    if (document.hidden) return;
    var leaf = document.createElement('div');
    leaf.className = 'leaf';
    var size = 12 + Math.random() * 14;
    var fall = 9 + Math.random() * 8;
    leaf.style.left = Math.random() * 100 + 'vw';
    leaf.style.width = leaf.style.height = size + 'px';
    leaf.style.animationDuration = fall + 's';
    leaf.style.opacity = 0.55 + Math.random() * 0.4;
    leaf.innerHTML = '<svg viewBox="0 0 20 20" style="animation-duration:' + (2 + Math.random() * 2) +
      's"><path d="M10 0C13 6 20 7 20 10S13 14 10 20C7 14 0 13 0 10S7 6 10 0Z" fill="' +
      LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)] + '"/></svg>';
    leafBox.appendChild(leaf);
    setTimeout(function () { leaf.remove(); }, fall * 1000);
  }
  if (!reduceMotion) {
    for (var i = 0; i < 4; i++) setTimeout(dropLeaf, i * 700);
    setInterval(dropLeaf, 1800);
  }

  // ---------- Booking: day picker ----------
  var form = $('#booking-form');
  var daysEl = $('#days');
  var dateInput = $('#date');
  var hint = $('#slot-hint');
  var errorBox = $('#form-error');
  var submitBtn = $('#submit-btn');
  var taken = {};          // { 'YYYY-MM-DD': ['morning', ...] } from Google Calendar
  var page = 0;            // which 2-week page of days is showing

  function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var firstBookable = addDays(today, 1);
  var lastBookable = addDays(today, daysAhead);
  var gridStart = addDays(firstBookable, -firstBookable.getDay()); // Sunday of that week
  var totalPages = Math.ceil(((lastBookable - gridStart) / 864e5 + 1) / 14);

  function isFull(key) { return (taken[key] || []).length >= ALL_WINDOWS.length; }
  function isOpen(d) {
    return d >= firstBookable && d <= lastBookable && workDays.indexOf(d.getDay()) !== -1 && !isFull(ymd(d));
  }

  function renderDays() {
    daysEl.innerHTML = '';
    var start = addDays(gridStart, page * 14);
    var months = [];
    for (var i = 0; i < 14; i++) {
      var d = addDays(start, i);
      var key = ymd(d);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(dateInput.value === key));
      btn.dataset.date = key;
      btn.innerHTML = '<small>' + d.toLocaleDateString('en-US', { weekday: 'short' }) + '</small><b>' + d.getDate() + '</b>';
      btn.setAttribute('aria-label', d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
      if (!isOpen(d)) {
        btn.disabled = true;
        if (isFull(key) && d >= firstBookable) btn.classList.add('full');
      }
      var m = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (months.indexOf(m) === -1) months.push(m);
      daysEl.appendChild(btn);
    }
    $('#month-label').textContent = months.map(function (m, idx) {
      return idx < months.length - 1 ? m.replace(/ \d{4}$/, '') : m;
    }).join(' – ');
    $('#days-prev').disabled = page === 0;
    $('#days-next').disabled = page >= totalPages - 1;
  }

  daysEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.day');
    if (!btn || btn.disabled) return;
    selectDate(btn.dataset.date);
  });
  $('#days-prev').addEventListener('click', function () { if (page > 0) { page--; renderDays(); } });
  $('#days-next').addEventListener('click', function () { if (page < totalPages - 1) { page++; renderDays(); } });

  function selectDate(key) {
    dateInput.value = key;
    daysEl.classList.remove('invalid');
    errorBox.hidden = true;
    $$('.day', daysEl).forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.date === key)); });
    updateWindows();
  }

  function updateWindows() {
    var key = dateInput.value;
    var full = taken[key] || [];
    $$('input[name="window"]').forEach(function (r) {
      r.disabled = !key || full.indexOf(r.value) !== -1;
      if (r.disabled) r.checked = false;
    });
    updateHint();
  }

  function updateHint() {
    var key = dateInput.value;
    var win = $('input[name="window"]:checked');
    if (!key) { hint.textContent = 'Choose a day, then an arrival window.'; return; }
    var nice = new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    hint.textContent = win ? '✓ ' + nice + ', ' + WINDOW_LABELS[win.value] : nice + ': now pick an arrival window.';
  }
  $('#windows').addEventListener('change', function () { $('#windows').classList.remove('invalid'); updateHint(); });

  function loadAvailability() {
    if (!endpoint) return Promise.resolve();
    return fetch(endpoint, { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.taken) {
          taken = data.taken;
          if (dateInput.value && !isOpen(new Date(dateInput.value + 'T00:00:00'))) dateInput.value = '';
          renderDays();
          updateWindows();
        }
      })
      .catch(function () { /* Availability is a nice-to-have; the server re-checks on submit. */ });
  }

  // ---------- Booking: submit ----------
  if (!endpoint) $('#preview-banner').hidden = false;

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function validate() {
    var problems = [];
    $$('.invalid', form).forEach(function (el) { el.classList.remove('invalid'); });
    if (!dateInput.value) { problems.push('a day'); daysEl.classList.add('invalid'); }
    if (!$('input[name="window"]:checked')) { problems.push('an arrival window'); $('#windows').classList.add('invalid'); }
    [['address', 'your address'], ['city', 'your town'], ['name', 'your name'], ['phone', 'a phone number'], ['email', 'your email']]
      .forEach(function (pair) {
        var el = form.elements[pair[0]];
        if (!el.value.trim()) { problems.push(pair[1]); el.classList.add('invalid'); }
      });
    var email = form.elements.email;
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      problems.push('a valid email'); email.classList.add('invalid');
    }
    return problems;
  }

  form.addEventListener('input', function (e) {
    e.target.classList && e.target.classList.remove('invalid');
    errorBox.hidden = true;
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.hidden = true;
    var problems = validate();
    if (problems.length) {
      showError('Almost there! Please add ' + problems.join(', ').replace(/, ([^,]*)$/, ' and $1') + '.');
      return;
    }

    var body = new URLSearchParams(new FormData(form));
    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking…';

    var request = endpoint
      ? fetch(endpoint, { method: 'POST', body: body }).then(function (r) { return r.json(); })
      : new Promise(function (resolve) { setTimeout(function () { resolve({ ok: true, preview: true }); }, 700); });

    request.then(function (res) {
      if (!res.ok) {
        if (res.taken) { taken = res.taken; renderDays(); updateWindows(); }
        throw new Error(res.error || 'Something went wrong.');
      }
      var win = $('input[name="window"]:checked').value;
      var nice = new Date(dateInput.value + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      $('#success-detail').innerHTML = '<strong>' + nice + '</strong>, ' + WINDOW_LABELS[win] +
        (res.preview ? '<br><em>(Preview mode: nothing was actually sent.)</em>' : '');
      form.classList.add('done');
      $('#success').hidden = false;
      $('#success').focus();
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      (taken[dateInput.value] = taken[dateInput.value] || []).push(win);
    }).catch(function (err) {
      var fallback = cfg.PHONE ? ' You can also call or text us at ' + cfg.PHONE + '.' :
        cfg.EMAIL ? ' You can also email us at ' + cfg.EMAIL + '.' : '';
      showError((err && err.message && err.message !== 'Failed to fetch' ? err.message : 'We couldn’t send your request. Please check your connection and try again.') + fallback);
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Book my cleanup';
    });
  });

  $('#book-another').addEventListener('click', function () {
    form.classList.remove('done');
    $('#success').hidden = true;
    dateInput.value = '';
    $$('input[name="window"]').forEach(function (r) { r.checked = false; });
    form.elements.notes.value = '';
    renderDays();
    updateWindows();
    loadAvailability();
  });

  renderDays();
  updateWindows();
  loadAvailability();
})();

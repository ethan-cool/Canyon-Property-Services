(function () {
  'use strict';
  var cfg = window.IGNIS_CONFIG || {};
  var phone = cfg.PHONE || '';
  var email = cfg.EMAIL || '';
  var digits = phone.replace(/[^\d+]/g, '');

  // Fill contact details everywhere they appear.
  function fill(attr, value) {
    document.querySelectorAll('[' + attr + ']').forEach(function (el) { el.textContent = value; });
  }
  fill('data-phone', phone);
  fill('data-email', email);
  fill('data-city', cfg.CITY || '');
  fill('data-area', cfg.SERVICE_AREA || '');

  document.querySelectorAll('a[data-tel]').forEach(function (a) {
    // Until a real number is set, call links fall back to the contact page.
    a.href = digits.length >= 7 ? 'tel:' + digits : 'contact.html';
  });
  document.querySelectorAll('a[data-mailto]').forEach(function (a) {
    a.href = email.indexOf('@') > 0 ? 'mailto:' + email : 'contact.html#quote';
  });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Mobile menu.
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open');
        toggle.focus();
      }
    });
  }

  // Quote form.
  var form = document.getElementById('quote-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var dateInput = form.querySelector('#date');
  if (dateInput) {
    var t = new Date();
    t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
    dateInput.min = t.toISOString().slice(0, 10);
  }

  // Pre-select a service when arriving from a "Get a quote" link like contact.html?service=restoration
  var params = new URLSearchParams(location.search);
  var svc = params.get('service');
  var svcSelect = form.querySelector('#service');
  if (svc && svcSelect) {
    Array.prototype.forEach.call(svcSelect.options, function (o) { if (o.value === svc) svcSelect.value = svc; });
  }

  function show(type, msg) {
    status.className = 'form-status show ' + type;
    status.textContent = msg;
    status.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (form.querySelector('.hp input').value) return; // spam bot

    var data = new FormData(form);
    data.delete('company_website');
    var btn = form.querySelector('button[type="submit"]');

    if (cfg.FORM_ENDPOINT) {
      btn.disabled = true;
      btn.textContent = 'Sending…';
      fetch(cfg.FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('Bad response');
          form.reset();
          show('ok', 'Thanks! Your request is in. We’ll get back to you within one business day with a quote.');
        })
        .catch(function () {
          show('err', 'Sorry, that didn’t go through. Please try again, or call or email us directly.');
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = 'Request my free quote';
        });
      return;
    }

    // No form service set up yet: open the visitor's email app with the details filled in.
    var labels = { name: 'Name', phone: 'Phone', email: 'Email', location: 'Address / ZIP', grill: 'Grill type',
      service: 'Service', date: 'Preferred date', message: 'Message' };
    var lines = [];
    Object.keys(labels).forEach(function (k) {
      var v = (data.get(k) || '').toString().trim();
      if (v) lines.push(labels[k] + ': ' + v);
    });
    var subject = 'Quote request from ' + (data.get('name') || 'website');
    var to = email.indexOf('@') > 0 ? email : '';
    window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines.join('\n'));
    show('ok', 'Your email app should open with your request filled in. Just hit send. If nothing opened, call or email us using the details on this page.');
  });
})();

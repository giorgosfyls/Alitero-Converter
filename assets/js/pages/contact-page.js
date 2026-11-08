/* =====================================================================
   contact-page.js — The contact form
   ---------------------------------------------------------------------
   How it works
     1. The visitor fills in name, email, subject and message.
     2. On Send we check the fields and show a clear message if
        something is missing or wrong.
     3. If everything is fine we open the visitor's own email app with
        the message already written (a mailto: link), addressed to the
        email in core/config.js.

   There is no server: the message is sent by the visitor's email app,
   not by this website. A success panel explains this and offers a
   fallback link in case no email app opened.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.Alitero;
  var CONFIG = A.CONFIG;

  function $(id) { return document.getElementById(id); }

  var els = {
    form: $('contact-form'),
    name: $('contact-name'),
    email: $('contact-email'),
    subject: $('contact-subject'),
    message: $('contact-message'),
    count: $('message-count'),
    error: $('form-error'),
    success: $('success-panel'),
    fallbackLink: $('fallback-link'),
    fallbackEmail: $('fallback-email')
  };

  var MAX_MESSAGE = 1500; // mailto: links break when they get too long

  /* ===================================================================
     Small helpers
     =================================================================== */

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * Shows (or clears) the error message above the Send button and,
   * when a field is given, marks it and moves the cursor there.
   */
  function setError(message, field) {
    els.error.textContent = message;
    els.error.hidden = !message;
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      field.focus();
    }
  }

  function clearInvalidMarks() {
    [els.name, els.email, els.message].forEach(function (field) {
      field.removeAttribute('aria-invalid');
    });
  }

  /* ===================================================================
     Events
     =================================================================== */

  // Live character counter for the message.
  els.message.maxLength = MAX_MESSAGE;
  els.message.addEventListener('input', function () {
    els.count.textContent = els.message.value.length + ' / ' + MAX_MESSAGE;
  });

  // Typing in a field removes its red mark and the error text.
  els.form.addEventListener('input', function (event) {
    event.target.removeAttribute('aria-invalid');
    if (!els.error.hidden) setError('');
  });

  els.form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearInvalidMarks();
    setError('');

    var name = els.name.value.trim();
    var email = els.email.value.trim();
    var message = els.message.value.trim();

    // 1) Check the fields (first problem found is shown).
    if (!name) return setError('Please enter your name.', els.name);
    if (!email || !isValidEmail(email)) return setError('Please enter a valid email address.', els.email);
    if (message.length < 10) return setError('Please write a message of at least 10 characters.', els.message);

    // 2) Build the email and open the visitor's email app.
    var subjectText = els.subject.options[els.subject.selectedIndex].text;
    var mailSubject = '[Alitero.org] ' + subjectText + ' from ' + name;
    var mailBody = 'Name: ' + name + '\nEmail: ' + email + '\n\nMessage:\n' + message;
    var mailto = 'mailto:' + CONFIG.contactEmail +
      '?subject=' + encodeURIComponent(mailSubject) +
      '&body=' + encodeURIComponent(mailBody);

    window.location.href = mailto;

    // 3) Explain what happened, with a fallback if no email app opened.
    els.fallbackLink.href = mailto;
    els.fallbackEmail.textContent = CONFIG.contactEmail;
    els.success.hidden = false;
    els.success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Empty the form for the next message.
    els.form.reset();
    els.count.textContent = '0 / ' + MAX_MESSAGE;
  });

  els.count.textContent = '0 / ' + MAX_MESSAGE;
})();

/* acacia-login-bridge.js - gives apps that keep their OWN login (POS, Mail, ...) a server session token.
 * It does not change how the app signs people in. When the person submits the login form, it reads the same
 * email/password (and company, if the form has one) and asks acx_login for a token via AcxSession.start().
 * Configure BEFORE this script:  window.ACX_LOGIN_BRIDGE = { email:'#le', password:'#lp', company:'#loginCompany' };
 * Needs acacia-session.js loaded first. If the app signs in with a username/PIN instead of an email, this cannot work. */
(function (w, d) {
  'use strict';
  var C = w.ACX_LOGIN_BRIDGE || {}, last = 0;
  function el(sel) { try { return sel ? d.querySelector(sel) : null; } catch (e) { return null; } }
  function go() {
    var now = Date.now(); if (now - last < 3000) return;
    var p = el(C.password), e = el(C.email); if (!p || !e || !p.value || !e.value) return;
    last = now;
    var co = el(C.company);
    if (w.AcxSession && w.AcxSession.start) w.AcxSession.start(e.value, p.value, co && co.value ? co.value.trim() : null);
  }
  function inLogin(t) { var p = el(C.password); return !!(p && t && t.nodeType === 1 && (t.contains(p) || (p.form && p.form.contains(t)) || (t.closest && p.closest && t.closest('form,section,div') && t.closest('form,section,div').contains(p)))); }
  d.addEventListener('submit', function (ev) { if (inLogin(ev.target)) go(); }, true);
  d.addEventListener('click', function (ev) { var b = ev.target && ev.target.closest && ev.target.closest('button,input[type=submit],[role=button]'); if (b && inLogin(b)) go(); }, true);
  d.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && ev.target && (ev.target === el(C.password) || ev.target === el(C.email) || ev.target === el(C.company))) go(); }, true);
})(window, document);

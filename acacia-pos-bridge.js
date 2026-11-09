/* acacia-pos-bridge.js - lets the shared Acacia tools (Notebook, Webinars, Team Status, Support Hub, Organization Details)
   work inside Acacia POS. POS keeps its own login (localStorage "pos_session"); this describes it to the shared files.
   Load it BEFORE acacia-support.js and acacia-sidebar.js. */
(function (w) {
  'use strict';
  w.ACX_APP = 'POS';
  w.ACX_SB_EXTERNAL = true; /* POS has its own right rail; the shared bar stays hidden and only its panels are used */
  function cur() { try { return JSON.parse(localStorage.getItem('pos_session') || 'null'); } catch (e) { return null; } }
  w.acxSession = function () {
    var c = cur(); if (!c || !c.companyId) return null;
    var id = String(c.companyId);
    return { companyId: id, obj: { email: c.email || '', name: c.name || '', fullName: c.name || '', username: c.email || '', companyId: id, companyName: c.companyName || '' } };
  };
  w.currentUser = function () { var s = w.acxSession(); return s ? s.obj : null; };
  w.toggleSupportPopup = function () { if (typeof w.acxOpenSupportPanel === 'function') w.acxOpenSupportPanel(); };
  /* wire the rail buttons that carry data-t */
  function wire() {
    var rr = document.getElementById('rrail'); if (!rr) return;
    rr.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-t]'); if (!b) return;
      if (typeof w.acxSidebarOpen === 'function') w.acxSidebarOpen(b.getAttribute('data-t'));
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})(window);

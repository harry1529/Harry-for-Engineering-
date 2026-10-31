/* =====================================================
   js/app.js — Mentor Harry for Engineering (Stage 1)
   Public site: routing, data loading, rendering, search,
   bookmarks, theme, PDF viewer and the Contribute form.

   Routes (all use the # in the address bar):
     #/                         home
     #/branches                 home, scrolled to branches
     #/branch/<slug>/<sem>      branch page (semester tabs)
     #/subject/<id>/<unit>      subject page (units accordion)
     #/bookmarks  #/contribute  #/about  #/contact
   ===================================================== */
(function () {
  'use strict';

  var cfg = window.MH_CONFIG || {};
  var DEFAULT_TITLE = document.title;

  // ---------- tiny helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeName(s) { return String(s).replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim(); }

  var state = { branches: [], subjects: [], units: [], demo: false, client: null, error: null };
  var home = $('#home-view');
  var page = $('#page-view');

  // =====================================================
  // 1. DATA (Supabase, or sample data in demo mode)
  // =====================================================
  function isConfigured() {
    return !!(window.supabase &&
      /^https:\/\/[a-z0-9-]+\.supabase\.co/i.test(cfg.SUPABASE_URL || '') &&
      (cfg.SUPABASE_ANON_KEY || '').length > 20 &&
      cfg.SUPABASE_ANON_KEY.indexOf('PASTE_') === -1);
  }

  function loadData() {
    if (!isConfigured()) {
      state.demo = true;
      var d = window.MH_SAMPLE;
      state.branches = d.branches; state.subjects = d.subjects; state.units = d.units;
      $('#demo-banner').hidden = false;
      return Promise.resolve();
    }
    state.client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    // RLS guarantees we only ever receive published rows.
    return Promise.all([
      state.client.from('branches').select('*').order('position'),
      state.client.from('subjects').select('*').order('position'),
      state.client.from('units').select('*').order('unit_number')
    ]).then(function (r) {
      var err = r[0].error || r[1].error || r[2].error;
      if (err) throw err;
      state.branches = r[0].data; state.subjects = r[1].data; state.units = r[2].data;
    });
  }

  var ready = loadData().catch(function (e) {
    console.error('Could not load data:', e);
    state.error = e;
  });

  function fileUrl(path, downloadName) {
    if (!path || !state.client) return null;
    var opts = downloadName ? { download: downloadName } : undefined;
    return state.client.storage.from(cfg.BUCKET || 'notes').getPublicUrl(path, opts).data.publicUrl;
  }

  function branchById(id) { return state.branches.find(function (b) { return b.id === id; }); }
  function subjectById(id) { return state.subjects.find(function (s) { return s.id === id; }); }
  function unitsOf(subjectId) {
    return state.units.filter(function (u) { return u.subject_id === subjectId; })
      .sort(function (a, b) { return a.unit_number - b.unit_number; });
  }

  // =====================================================
  // 2. THEME, MENU, TOAST
  // =====================================================
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = $('#theme-toggle');
    btn.setAttribute('aria-pressed', String(t === 'light'));
    btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    $('#theme-icon').textContent = t === 'light' ? '☾' : '☀';
    $('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#F5F6FC' : '#0B1026');
  }
  applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
  $('#theme-toggle').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try { localStorage.setItem('mh_theme', next); } catch (e) {}
  });

  function closeMenu() {
    $('#nav-links').classList.remove('open');
    $('#menu-btn').setAttribute('aria-expanded', 'false');
  }
  $('#menu-btn').addEventListener('click', function () {
    var open = $('#nav-links').classList.toggle('open');
    this.setAttribute('aria-expanded', String(open));
  });

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3500);
  }

  $('#year').textContent = new Date().getFullYear();

  // =====================================================
  // 3. BOOKMARKS (saved in this browser only)
  // =====================================================
  var BM_KEY = 'mh_bookmarks';
  function getBM() { try { return JSON.parse(localStorage.getItem(BM_KEY)) || []; } catch (e) { return []; } }
  function setBM(a) { try { localStorage.setItem(BM_KEY, JSON.stringify(a)); } catch (e) {} }
  function isBM(id) { return getBM().indexOf(id) > -1; }
  function toggleBM(id) {
    var a = getBM(), i = a.indexOf(id);
    if (i > -1) a.splice(i, 1); else a.push(id);
    setBM(a); updateBMCount();
    return i === -1;
  }
  function updateBMCount() {
    var n = getBM().length, el = $('#bm-count');
    el.textContent = n; el.hidden = n === 0;
  }
  updateBMCount();

  // =====================================================
  // 4. VIEW SWITCHING
  // =====================================================
  function setActiveNav(name) {
    $$('.nav-link[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === name);
    });
  }

  function showHome(scrollToBranches) {
    page.hidden = true; page.innerHTML = '';
    home.hidden = false;
    document.title = DEFAULT_TITLE;
    setActiveNav('');
    requestAnimationFrame(function () {
      window.MHAnim.refresh();
      if (scrollToBranches) window.MHAnim.scrollTo('#branches'); else window.MHAnim.toTop();
    });
  }

  function mountPage(html, title, navName) {
    home.hidden = true; page.hidden = false;
    page.innerHTML = html;
    document.title = title + ' | Mentor Harry for Engineering';
    setActiveNav(navName || '');
    window.MHAnim.toTop();
    window.MHAnim.pageIn(page);
  }

  function skeletonPage() {
    mountPage('<section class="page"><div class="container">' +
      '<div class="skeleton" style="height:40px;width:50%;border-radius:12px"></div>' +
      '<div class="grid" style="margin-top:36px">' +
      '<div class="glass skeleton" style="height:170px"></div>' +
      '<div class="glass skeleton" style="height:170px"></div>' +
      '<div class="glass skeleton" style="height:170px"></div></div></div></section>', 'Loading');
  }

  function errorPage() {
    mountPage('<section class="page"><div class="container"><div class="glass empty"><b>Could not load notes</b>' +
      'Please check your internet connection and refresh. If you are the owner, check your Supabase URL and key in <code>js/config.js</code> ' +
      'and that you ran <code>supabase/schema.sql</code>.</div></div></section>', 'Error');
  }

  function notFoundPage() {
    mountPage('<section class="page"><div class="container"><div class="glass empty"><b>Page not found</b>' +
      'That page does not exist. <a href="#/" style="color:var(--cyan)">Go back home</a>.</div></div></section>', 'Not found');
  }

  // =====================================================
  // 5. HOME: branch slider + search
  // =====================================================
  function renderBranches() {
    var el = $('#branch-slider');
    var live = state.branches.map(function (b) {
      var n = state.subjects.filter(function (s) { return s.branch_id === b.id; }).length;
      return '<a class="branch-card glass" href="#/branch/' + encodeURIComponent(b.slug) + '">' +
        '<span class="branch-icon" aria-hidden="true">' + esc(b.icon || '🎓') + '</span>' +
        '<h3>' + esc(b.name) + '</h3><p>' + esc(b.full_name || b.description || '') + '</p>' +
        '<span class="branch-meta">' + n + ' subject' + (n === 1 ? '' : 's') + ' →</span></a>';
    });
    var soon = (cfg.COMING_SOON || []).map(function (b) {
      return '<div class="branch-card glass is-soon">' +
        '<span class="branch-icon" aria-hidden="true">' + esc(b.icon || '🎓') + '</span>' +
        '<h3>' + esc(b.name) + '</h3><p>Notes are on the way.</p>' +
        '<span class="branch-meta">Coming soon</span></div>';
    });
    el.innerHTML = live.concat(soon).join('');
  }

  $('#slide-prev').addEventListener('click', function () { $('#branch-slider').scrollBy({ left: -290, behavior: 'smooth' }); });
  $('#slide-next').addEventListener('click', function () { $('#branch-slider').scrollBy({ left: 290, behavior: 'smooth' }); });

  // Search across subjects and units
  var searchIndex = [];
  function buildIndex() {
    searchIndex = [];
    state.subjects.forEach(function (s) {
      var b = branchById(s.branch_id);
      searchIndex.push({
        text: (s.name + ' ' + (s.code || '')).toLowerCase(),
        title: s.name,
        sub: 'Subject · ' + (b ? b.name : '') + ' · Semester ' + s.semester,
        href: '#/subject/' + encodeURIComponent(s.id)
      });
    });
    state.units.forEach(function (u) {
      var s = subjectById(u.subject_id); if (!s) return;
      var b = branchById(s.branch_id);
      searchIndex.push({
        text: (u.title + ' ' + (u.description || '') + ' ' + s.name).toLowerCase(),
        title: 'Unit ' + u.unit_number + ': ' + u.title,
        sub: s.name + ' · ' + (b ? b.name : '') + ' · Semester ' + s.semester,
        href: '#/subject/' + encodeURIComponent(s.id) + '/' + u.unit_number
      });
    });
  }

  function runSearch() {
    var box = $('#search-results');
    var q = $('#search-input').value.trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; box.innerHTML = ''; return; }
    var hits = searchIndex.filter(function (i) { return i.text.indexOf(q) > -1; }).slice(0, 8);
    box.innerHTML = hits.length
      ? hits.map(function (h) { return '<a href="' + h.href + '"><b>' + esc(h.title) + '</b><small>' + esc(h.sub) + '</small></a>'; }).join('')
      : '<div class="none">No match yet. Try another word, or check back soon.</div>';
    box.hidden = false;
  }
  var searchTimer;
  $('#search-input').addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { ready.then(runSearch); }, 150);
  });
  $('#search-form').addEventListener('submit', function (e) {
    e.preventDefault();
    ready.then(function () {
      runSearch();
      var first = $('#search-results a');
      if (first) location.hash = first.getAttribute('href');
    });
  });
  $('#search-input').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { $('#search-results').hidden = true; }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#search-form')) $('#search-results').hidden = true;
  });
  $('#search-results').addEventListener('click', function () {
    $('#search-results').hidden = true; $('#search-input').value = '';
  });

  // =====================================================
  // 6. BRANCH PAGE
  // =====================================================
  function branchPage(slug, semParam) {
    var b = state.branches.find(function (x) { return x.slug === slug; });
    if (!b) return notFoundPage();
    var subs = state.subjects.filter(function (s) { return s.branch_id === b.id; });
    var sem = parseInt(semParam, 10);
    if (!(sem >= 1 && sem <= 8)) {
      var sems = subs.map(function (s) { return s.semester; }).sort(function (a, c) { return a - c; });
      sem = sems[0] || 1;
    }

    var tabs = '';
    for (var i = 1; i <= 8; i++) {
      tabs += '<button class="tab" role="tab" type="button" id="tab-' + i + '" data-sem="' + i + '" ' +
        'aria-selected="' + (i === sem) + '" aria-controls="sem-panel" tabindex="' + (i === sem ? 0 : -1) + '">Sem ' + i + '</button>';
    }

    mountPage(
      '<section class="page"><div class="container">' +
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> <span>/</span> <span>' + esc(b.name) + '</span></nav>' +
      '<div class="page-head"><span class="branch-icon" aria-hidden="true">' + esc(b.icon || '🎓') + '</span>' +
      '<div><h1>' + esc(b.full_name || b.name) + '</h1>' +
      (b.description ? '<p class="page-sub">' + esc(b.description) + '</p>' : '') + '</div></div>' +
      '<div class="tabs" role="tablist" aria-label="Semesters">' + tabs + '</div>' +
      '<div id="sem-panel" role="tabpanel" tabindex="0"></div>' +
      '</div></section>',
      b.name + ' Notes', ''
    );

    function renderPanel(n) {
      var list = subs.filter(function (s) { return s.semester === n; });
      var panel = $('#sem-panel');
      panel.setAttribute('aria-labelledby', 'tab-' + n);
      if (!list.length) {
        panel.innerHTML = '<div class="glass empty"><b>Semester ' + n + ' notes are coming soon</b>We are adding subjects regularly. Check back soon.</div>';
        return;
      }
      panel.innerHTML = '<div class="grid">' + list.map(function (s) {
        var count = unitsOf(s.id).length;
        return '<a class="subject-card glass" href="#/subject/' + encodeURIComponent(s.id) + '">' +
          (s.code ? '<span class="code">' + esc(s.code) + '</span>' : '') +
          '<h3>' + esc(s.name) + '</h3><p>' + esc(s.description || '') + '</p>' +
          '<span class="meta">' + count + ' unit' + (count === 1 ? '' : 's') + ' →</span></a>';
      }).join('') + '</div>';
    }
    renderPanel(sem);

    var tablist = $('.tabs', page);
    function selectTab(btn) {
      var n = parseInt(btn.getAttribute('data-sem'), 10);
      $$('.tab', tablist).forEach(function (t) {
        var on = t === btn;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      renderPanel(n);
      history.replaceState(null, '', '#/branch/' + encodeURIComponent(b.slug) + '/' + n);
    }
    tablist.addEventListener('click', function (e) {
      var t = e.target.closest('.tab'); if (t) selectTab(t);
    });
    tablist.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var all = $$('.tab', tablist);
      var idx = all.indexOf(document.activeElement); if (idx < 0) return;
      var nxt = all[(idx + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      nxt.focus(); selectTab(nxt);
    });
  }

  // =====================================================
  // 7. SUBJECT PAGE (units accordion)
  // =====================================================
  var DOCS = [
    { key: 'notes_path', label: 'Notes', primary: true },
    { key: 'iq_path', label: 'Important Questions' },
    { key: 'pyq_path', label: 'PYQ' }
  ];

  function docButtons(unit, subject) {
    return DOCS.map(function (d) {
      var view = fileUrl(unit[d.key]);
      if (!view) return d.primary ? '<span class="chip chip-soon">Notes coming soon</span>' : '';
      var title = subject.name + ' · Unit ' + unit.unit_number + ' · ' + d.label;
      var dl = fileUrl(unit[d.key], safeName(subject.name + ' Unit ' + unit.unit_number + ' ' + d.label) + '.pdf');
      return '<div class="doc' + (d.primary ? ' doc-primary' : '') + '">' +
        '<span class="doc-label">' + d.label + '</span>' +
        '<button class="btn btn-sm" type="button" data-view="' + esc(view) + '" data-title="' + esc(title) + '">View</button>' +
        '<a class="btn btn-sm btn-ghost" href="' + esc(dl) + '" download>Download</a></div>';
    }).join('');
  }

  function unitHtml(u, subject, open) {
    var on = isBM(u.id);
    return '<article class="unit glass' + (open ? ' open' : '') + '">' +
      '<div class="unit-row">' +
      '<button class="unit-toggle" type="button" aria-expanded="' + open + '" aria-controls="ub-' + esc(u.id) + '">' +
      '<span class="unit-num" aria-hidden="true">' + u.unit_number + '</span>' +
      '<span class="unit-title"><span class="sr-only">Unit ' + u.unit_number + ': </span>' + esc(u.title) + '</span>' +
      '<span class="unit-caret" aria-hidden="true">▾</span></button>' +
      '<button class="bm-btn" type="button" data-bm="' + esc(u.id) + '" aria-pressed="' + on + '" ' +
      'aria-label="' + (on ? 'Remove bookmark' : 'Bookmark') + ' Unit ' + u.unit_number + '">' + (on ? '★' : '☆') + '</button>' +
      '</div>' +
      '<div class="unit-body" id="ub-' + esc(u.id) + '"><div class="unit-body-inner"><div class="unit-content">' +
      (u.description ? '<p>' + esc(u.description) + '</p>' : '') +
      '<div class="docs">' + docButtons(u, subject) + '</div>' +
      '</div></div></div></article>';
  }

  function subjectPage(id, unitParam) {
    var s = subjectById(id);
    if (!s) return notFoundPage();
    var b = branchById(s.branch_id);
    var units = unitsOf(s.id);
    var openNum = parseInt(unitParam, 10) || (units[0] && units[0].unit_number);

    mountPage(
      '<section class="page"><div class="container">' +
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> <span>/</span> ' +
      (b ? '<a href="#/branch/' + encodeURIComponent(b.slug) + '/' + s.semester + '">' + esc(b.name) + ' · Sem ' + s.semester + '</a> <span>/</span> ' : '') +
      '<span>' + esc(s.name) + '</span></nav>' +
      '<div class="page-head"><div>' + (s.code ? '<span class="code">' + esc(s.code) + '</span>' : '') +
      '<h1>' + esc(s.name) + '</h1>' +
      (s.description ? '<p class="page-sub">' + esc(s.description) + '</p>' : '') + '</div></div>' +
      (units.length
        ? '<div class="units">' + units.map(function (u) { return unitHtml(u, s, u.unit_number === openNum); }).join('') + '</div>'
        : '<div class="glass empty"><b>Units coming soon</b>Notes for this subject are being prepared.</div>') +
      '</div></section>',
      s.name + ' Notes', ''
    );

    if (unitParam) {
      var opened = $('.unit.open', page);
      if (opened) setTimeout(function () { window.MHAnim.scrollTo('.unit.open'); }, 450);
    }
  }

  // =====================================================
  // 8. BOOKMARKS PAGE
  // =====================================================
  function bookmarksPage() {
    mountPage('<section class="page"><div class="container">' +
      '<h1>Your bookmarks</h1><p class="page-sub">Saved on this device only. Clearing your browser data removes them.</p>' +
      '<div id="bm-list" class="units" style="margin-top:32px"></div></div></section>', 'Bookmarks', 'bookmarks');
    renderBookmarkList();
  }

  function renderBookmarkList() {
    var el = $('#bm-list'); if (!el) return;
    var ids = getBM();
    var items = ids.map(function (id) { return state.units.find(function (u) { return u.id === id; }); }).filter(Boolean);
    if (!items.length) {
      el.innerHTML = '<div class="glass empty"><b>No bookmarks yet</b>Tap the ☆ next to any unit to save it here.</div>';
      return;
    }
    el.innerHTML = items.map(function (u) {
      var s = subjectById(u.subject_id), b = s && branchById(s.branch_id);
      return '<div class="bm-item glass"><div class="grow"><h3>Unit ' + u.unit_number + ': ' + esc(u.title) + '</h3>' +
        '<small>' + esc(s ? s.name : '') + (b ? ' · ' + esc(b.name) + ' · Sem ' + s.semester : '') + '</small></div>' +
        '<a class="btn btn-sm btn-ghost" href="#/subject/' + encodeURIComponent(u.subject_id) + '/' + u.unit_number + '">Open →</a>' +
        '<button class="bm-btn" type="button" data-bm="' + esc(u.id) + '" aria-pressed="true" aria-label="Remove bookmark" style="margin-right:0">★</button></div>';
    }).join('');
  }

  // =====================================================
  // 9. CONTRIBUTE, ABOUT, CONTACT
  // =====================================================
  function contributePage() {
    mountPage('<section class="page"><div class="container">' +
      '<div class="section-label">SHARE YOUR NOTES</div><h1>Contribute notes</h1>' +
      '<p class="page-sub">Have good handwritten or typed notes? Share a link (Google Drive, etc.) and we will review it before publishing. Please share only your own work.</p>' +
      '<form class="form glass" id="contribute-form" style="margin-top:32px" novalidate>' +
      '<div class="row"><div class="field"><label for="c-name">Your name *</label><input id="c-name" name="name" maxlength="100" required autocomplete="name"></div>' +
      '<div class="field"><label for="c-email">Email (optional)</label><input id="c-email" name="email" type="email" maxlength="200" autocomplete="email"></div></div>' +
      '<div class="row"><div class="field"><label for="c-branch">Branch</label><input id="c-branch" name="branch" maxlength="100" placeholder="e.g. CSE"></div>' +
      '<div class="field"><label for="c-subject">Subject</label><input id="c-subject" name="subject" maxlength="150" placeholder="e.g. Data Structures"></div></div>' +
      '<div class="field"><label for="c-unit">Unit</label><input id="c-unit" name="unit" maxlength="150" placeholder="e.g. Unit 3: Linked Lists"></div>' +
      '<div class="field"><label for="c-link">Link to your notes (Google Drive, etc.) *</label><input id="c-link" name="link" type="url" maxlength="500" placeholder="https://" required></div>' +
      '<div class="field"><label for="c-msg">Message (optional)</label><textarea id="c-msg" name="message" maxlength="2000"></textarea></div>' +
      '<div class="hp" aria-hidden="true"><label>Leave empty <input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<button class="btn" type="submit" id="c-submit">Send for review</button>' +
      '<p class="form-note">Submissions are reviewed by the site owner. Your email is never shown publicly.</p>' +
      '</form></div></section>', 'Contribute notes', 'contribute');

    $('#contribute-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = new FormData(this);
      if (f.get('website')) return; // bot trap
      function v(k) { var x = String(f.get(k) || '').trim(); return x || null; }
      var row = { name: v('name'), email: v('email'), branch: v('branch'), subject: v('subject'), unit: v('unit'), link: v('link'), message: v('message') };
      if (!row.name) return toast('Please enter your name.');
      if (!row.link || !/^https?:\/\//i.test(row.link)) return toast('Please add a valid link starting with http:// or https://');
      if (row.email && !/^\S+@\S+\.\S+$/.test(row.email)) return toast('That email does not look right.');

      try {
        var last = parseInt(localStorage.getItem('mh_last_submit') || '0', 10);
        if (Date.now() - last < 30000) return toast('Please wait a few seconds before sending again.');
      } catch (err) {}

      if (state.demo) return toast('Demo mode: Supabase is not connected, so nothing was saved.');

      var btn = $('#c-submit'); btn.disabled = true;
      state.client.from('submissions').insert(row).then(function (res) {
        btn.disabled = false;
        if (res.error) { console.error(res.error); return toast('Sorry, could not send. Please try again.'); }
        try { localStorage.setItem('mh_last_submit', String(Date.now())); } catch (err) {}
        $('#contribute-form').reset();
        toast('Thank you! Your notes were sent for review.');
      });
    });
  }

  function aboutPage() {
    mountPage('<section class="page"><div class="container prose">' +
      '<div class="section-label">ABOUT</div><h1>About Mentor Harry</h1>' +
      '<p>Mentor Harry for Engineering is a free notes hub for engineering students. Notes are organised the way you actually study: branch, semester, subject, then unit.</p>' +
      '<h2>Why it exists</h2><p>Good notes are scattered across chats, drives and photos. This site puts them in one clean place so you can find the exact unit you need, read it in your browser, or download it.</p>' +
      '<h2>Who builds it</h2><p>Built and maintained by ' + esc(cfg.OWNER_NAME || 'the site owner') + ', a Computer Science student. Have a correction or want to help? Use the <a href="#/contribute" style="color:var(--cyan)">Contribute</a> page.</p>' +
      '</div></section>', 'About', 'about');
  }

  function contactPage() {
    var mail = esc(cfg.CONTACT_EMAIL || '');
    mountPage('<section class="page"><div class="container">' +
      '<div class="section-label">CONTACT</div><h1>Get in touch</h1>' +
      '<p class="page-sub">Found a mistake in the notes, or want to suggest a subject? Write to us.</p>' +
      '<div class="contact-list"><a class="glass" href="mailto:' + mail + '"><b>Email</b><br><span style="color:var(--muted)">' + mail + '</span></a>' +
      '<a class="glass" href="#/contribute"><b>Contribute notes</b><br><span style="color:var(--muted)">Share your notes for review</span></a></div>' +
      '</div></section>', 'Contact', 'contact');
  }

  // =====================================================
  // 10. PDF VIEWER (modal)
  // =====================================================
  var lastFocus = null;
  function openViewer(url, title) {
    lastFocus = document.activeElement;
    $('#viewer-title').textContent = title || 'Document';
    $('#viewer-open').setAttribute('href', url);
    $('#viewer-frame').setAttribute('src', url + '#view=FitH');
    $('#viewer').hidden = false;
    window.MHAnim.lock(true);
    $('#viewer-close').focus();
  }
  function closeViewer() {
    if ($('#viewer').hidden) return;
    $('#viewer').hidden = true;
    $('#viewer-frame').setAttribute('src', 'about:blank');
    window.MHAnim.lock(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('#viewer-close').addEventListener('click', closeViewer);
  $('#viewer').addEventListener('click', function (e) { if (e.target === this) closeViewer(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeViewer();
    // keep keyboard focus inside the open viewer
    if (e.key === 'Tab' && !$('#viewer').hidden) {
      var f = $$('#viewer a, #viewer button');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // =====================================================
  // 11. GLOBAL CLICK HANDLING
  // =====================================================
  document.addEventListener('click', function (e) {
    // View a PDF
    var v = e.target.closest('[data-view]');
    if (v) { openViewer(v.getAttribute('data-view'), v.getAttribute('data-title')); return; }

    // Accordion
    var tg = e.target.closest('.unit-toggle');
    if (tg) {
      var unit = tg.closest('.unit');
      var open = unit.classList.toggle('open');
      tg.setAttribute('aria-expanded', String(open));
      return;
    }

    // Bookmark star
    var bm = e.target.closest('[data-bm]');
    if (bm) {
      var on = toggleBM(bm.getAttribute('data-bm'));
      bm.setAttribute('aria-pressed', String(on));
      bm.textContent = on ? '★' : '☆';
      toast(on ? 'Bookmarked' : 'Bookmark removed');
      if ($('#bm-list')) renderBookmarkList();
      return;
    }

    // Smooth scroll links that point to a section on the home page
    var sc = e.target.closest('[data-scroll-to]');
    if (sc && !home.hidden) {
      e.preventDefault();
      window.MHAnim.scrollTo(sc.getAttribute('data-scroll-to'));
      closeMenu();
      return;
    }

    if (e.target.closest('.nav-link')) closeMenu();
  });

  // =====================================================
  // 12. ROUTER
  // =====================================================
  function route() {
    closeViewer(); closeMenu();
    var p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    var a = p[0], b = p[1], c = p[2];

    if (!a) return showHome(false);
    if (a === 'branches') return showHome(true);

    // Pages that do not need data
    if (a === 'about') return aboutPage();
    if (a === 'contact') return contactPage();
    if (a === 'contribute') return contributePage();

    // Pages that need data
    skeletonPage();
    ready.then(function () {
      if (state.error) return errorPage();
      if (a === 'branch' && b) return branchPage(b, c);
      if (a === 'subject' && b) return subjectPage(b, c);
      if (a === 'bookmarks') return bookmarksPage();
      notFoundPage();
    });
  }

  window.addEventListener('hashchange', route);

  // Start: fill the home page as soon as data arrives, then route
  ready.then(function () {
    if (state.error) {
      $('#branch-slider').innerHTML = '<div class="glass empty" style="flex:1">Could not load branches. Please refresh.</div>';
      return;
    }
    renderBranches();
    buildIndex();
    window.MHAnim.refresh();
  });
  route();
})();

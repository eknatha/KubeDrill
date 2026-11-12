/* Unified UI layer: live hero, Ctrl+K palette, lab card states, progress ring + share card, mobile lab tabs. Offline, no deps. */
(function () {
  'use strict';
  var KL = window.KL;
  function $(i) { return document.getElementById(i); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function labs() { return (KL.Labs && KL.Labs.list) || []; }

  // ── hero: live cluster + proof chips ──
  function hero() {
    var h = document.querySelector('#page-home .hero'); if (!h || h.querySelector('.hero-live') || h.querySelector('.hero-proof')) return;
    var dots = [[0, '#22c55e'], [60, '#22c55e'], [120, '#38bdf8'], [180, '#22c55e'], [240, '#ef4444'], [300, '#22c55e']].map(function (d) { return '<g transform="rotate(' + d[0] + ' 150 150)"><circle cx="150" cy="40" r="11" fill="#0f1a30" stroke="' + d[1] + '" stroke-width="2"/><circle cx="150" cy="40" r="4" fill="' + d[1] + '"' + (d[1] === '#ef4444' ? ' class="hl-bad"' : '') + '/></g>'; }).join('');
    var fig = document.createElement('figure'); fig.className = 'hero-live';
    fig.innerHTML = '<svg width="300" height="300" viewBox="0 0 300 300" role="img" aria-label="Animated ring of pods around a control plane; one pod is failing"><circle cx="150" cy="150" r="110" fill="none" stroke="rgba(148,163,184,.25)" stroke-dasharray="3 7"/><circle cx="150" cy="150" r="46" fill="rgba(56,189,248,.10)" stroke="#38bdf8" stroke-width="2"/><text x="150" y="147" text-anchor="middle" fill="currentColor" font-size="12" font-weight="600">Control</text><text x="150" y="162" text-anchor="middle" fill="currentColor" font-size="12" font-weight="600">plane</text><g class="hl-orbit">' + dots + '</g></svg><figcaption>One pod is failing. Can you find out why?</figcaption>';
    var proof = document.createElement('div'); proof.className = 'hero-proof'; proof.innerHTML = '<span>Free</span><span>Works offline</span><span>No ads or tracking</span><span>' + labs().length + ' auto-checked labs</span>';
    var ctas = h.querySelector('.hero-ctas'); if (ctas) { ctas.parentNode.insertBefore(proof, ctas.nextSibling); proof.parentNode.insertBefore(fig, proof.nextSibling); } else h.appendChild(fig);
  }

  // ── command palette ──
  var pal = null;
  function items() {
    var out = [], old = []; try { old = (KL.palItems && KL.palItems()) || []; } catch (e) { old = []; }
    old.forEach(function (x) { if (/^Lab/.test(x.k)) return; out.push({ k: x.k.replace(/ .*/, '').toUpperCase(), t: x.t, s: x.s || '', go: x.fn ? x.fn : (function (h) { return function () { location.hash = h; }; })(x.h || '#home') }); });
    (KL.palExtra || []).forEach(function (x) { out.push(x); });
    labs().forEach(function (l) { out.push({ k: l.incident ? 'INCIDENT' : 'LAB', t: l.num + ' · ' + l.title, s: (l.track || '') + ' ' + (l.domain || ''), go: function () { location.hash = '#lab/' + l.id; } }); });
    (KL.flows || []).forEach(function (f, i) { out.push({ k: 'FLOW', t: f.title, go: function () { location.hash = '#field'; setTimeout(function () { var b = document.querySelector('[data-t="flows"]'); if (b) { KL.flowSel(i); b.click(); } }, 200); } }); });
    (KL.outages || []).forEach(function (o) { out.push({ k: 'OUTAGE', t: o.org + ' ' + o.when + ': ' + o.title, go: function () { location.hash = '#field'; setTimeout(function () { var b = document.querySelector('[data-t="outages"]'); if (b) b.click(); }, 200); } }); });
    return out;
  }
  function closePal() { if (pal) { pal.bg.remove(); document.removeEventListener('keydown', pal.key, true); pal = null; } }
  function openPal() {
    if (pal) return; var all = items(), sel = 0, shown = [];
    var bg = document.createElement('div'); bg.className = 'pal-bg';
    bg.innerHTML = '<div class="pal" role="dialog" aria-label="Command palette"><input id="palIn" placeholder="Jump to a lab, flowchart, outage or page" autocomplete="off" aria-label="Search"><ul id="palList" role="listbox"></ul></div>';
    document.body.appendChild(bg); var inp = bg.querySelector('input'), ul = bg.querySelector('ul');
    function draw() {
      var q = inp.value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
      shown = all.map(function (x, n) { var h = (x.k + ' ' + x.t + ' ' + (x.s || '')).toLowerCase(), t = x.t.toLowerCase(), sc = 0; if (!words.every(function (w) { return h.indexOf(w) >= 0; })) return null; words.forEach(function (w) { sc += t.indexOf(w) >= 0 ? 3 : 1; }); if (t === q) sc += 5; return { x: x, sc: sc, n: n }; }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc || a.n - b.n; }).slice(0, 9).map(function (r) { return r.x; }); sel = Math.min(sel, Math.max(0, shown.length - 1));
      ul.innerHTML = shown.length ? shown.map(function (x, i) { return '<li role="option" data-i="' + i + '" class="' + (i === sel ? 'sel' : '') + '" aria-selected="' + (i === sel) + '"><b>' + x.k + '</b><span>' + esc(x.t) + '</span></li>'; }).join('') : '<div class="pal-empty">No matches</div>';
    }
    function go(i) { var x = shown[i]; if (!x) return; closePal(); x.go(); }
    inp.addEventListener('input', function () { sel = 0; draw(); });
    ul.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) go(+li.dataset.i); });
    bg.addEventListener('mousedown', function (e) { if (e.target === bg) closePal(); });
    var key = function (e) {
      if (e.key === 'Escape') { closePal(); e.stopPropagation(); } else if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); } else if (e.key === 'Enter') { go(sel); e.preventDefault(); }
    };
    pal = { bg: bg, key: key }; document.addEventListener('keydown', key, true); draw(); inp.focus();
  }
  KL.openPalette = openPal;
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal ? closePal() : openPal(); } });
  function navBtn() { var b = document.querySelector('.nav-icon-btn'); if (!b || $('navK')) return; return; var k = document.createElement('button'); k.id = 'navK'; k.type = 'button'; k.className = 'nav-k'; k.textContent = 'Ctrl K'; k.setAttribute('aria-label', 'Open command palette'); k.onclick = openPal; b.parentNode.insertBefore(k, b); }

  // ── labs page states ──
  function cards() {
    document.querySelectorAll('.ilab-card[data-id]').forEach(function (c) {
      if (c.dataset.u2) return; c.dataset.u2 = '1'; var l = KL.Labs.byId[c.dataset.id]; if (!l) return; var top = c.querySelector('.ilab-top'); if (!top) return;
      if (l.incident) { c.classList.add('inc'); top.insertAdjacentHTML('beforeend', '<span class="ilab-tag inc">Incident</span>'); } else if (/^s(7[4-9]|[89][0-9])-/.test(l.id) && !c.classList.contains('done')) top.insertAdjacentHTML('beforeend', '<span class="ilab-tag new">New</span>');
    });
  }

  // ── progress: ring + share card ──
  function counts() { var L = labs(), s = KL.store, done = 0; try { done = L.filter(function (l) { return s.labDone(l.id); }).length; } catch (e) {} return { done: done, total: L.length, streak: KL.daily ? KL.daily.streak() : 0 }; }
  function progress() {
    var root = $('progressRoot'); if (!root || root.querySelector('.pg-ring') || !root.querySelector('.pg-grid')) return; var c = counts(), pct = c.total ? Math.round(c.done * 100 / c.total) : 0, off = Math.round(163 * (1 - pct / 100));
    var d = document.createElement('div'); d.className = 'pg-ring';
    d.innerHTML = '<svg width="72" height="72" viewBox="0 0 72 72" role="img" aria-label="' + pct + ' percent of labs fixed"><circle cx="36" cy="36" r="26" fill="none" stroke="rgba(148,163,184,.25)" stroke-width="7"/><circle class="fg" cx="36" cy="36" r="26" fill="none" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" stroke-dasharray="163" stroke-dashoffset="' + off + '" transform="rotate(-90 36 36)"/></svg><div><b>' + pct + '%</b><span>' + c.done + ' of ' + c.total + ' labs fixed · ' + c.streak + '-day streak</span></div><button class="btn-secondary" id="pgShare" style="margin-left:auto">Make share card (PNG)</button>';
    var g = root.querySelector('.pg-grid'); g.parentNode.insertBefore(d, g); $('pgShare').onclick = shareCard;
  }
  function shareCard() {
    var c = counts(), cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630; var x = cv.getContext('2d');
    x.fillStyle = '#0b1220'; x.fillRect(0, 0, 1200, 630); var gr = x.createRadialGradient(1040, 80, 20, 1040, 80, 420); gr.addColorStop(0, 'rgba(56,189,248,.25)'); gr.addColorStop(1, 'rgba(56,189,248,0)'); x.fillStyle = gr; x.fillRect(0, 0, 1200, 630);
    x.fillStyle = '#eaf0fb'; x.font = '700 30px system-ui,sans-serif'; x.fillText('KubeDrill', 64, 90); x.fillStyle = '#a9b6cc'; x.font = '20px system-ui,sans-serif'; x.textAlign = 'right'; x.fillText('kubedrill.eknathalabs.com', 1136, 90); x.textAlign = 'left';
    x.fillStyle = '#7dd3fc'; x.font = '600 20px system-ui,sans-serif'; x.fillText('ACHIEVEMENT', 64, 250); x.fillStyle = '#eaf0fb'; x.font = '700 84px system-ui,sans-serif'; x.fillText(c.done + ' broken clusters fixed', 64, 345);
    x.fillStyle = '#b6c3d9'; x.font = '28px system-ui,sans-serif'; x.fillText('of ' + c.total + ' labs · ' + c.streak + '-day streak', 64, 405);
    x.font = '18px system-ui,sans-serif'; x.fillStyle = '#cbd5e1'; ['Free', 'Offline', 'No ads'].forEach(function (t, i) { var px = 64 + i * 150; x.strokeStyle = 'rgba(255,255,255,.25)'; x.strokeRect(px, 520, 130, 42); x.fillText(t, px + 26, 548); });
    x.fillStyle = '#8091ad'; x.font = '15px system-ui,sans-serif'; x.textAlign = 'right'; x.fillText('Generated in your browser. No account, no upload.', 1136, 548);
    cv.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'kubedrill-progress.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); });
  }

  // ── mobile lab tabs ──
  function mtabs() {
    var sp = document.querySelector('.lr-split'); if (!sp || document.querySelector('.lr-mtabs')) return; if (!sp.dataset.mtab) sp.dataset.mtab = 'tasks';
    var bar = document.createElement('div'); bar.className = 'lr-mtabs'; bar.setAttribute('role', 'tablist');
    [['tasks', 'Tasks'], ['term', 'Terminal'], ['dia', 'Cluster']].forEach(function (t) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.m = t[0]; b.textContent = t[1]; b.setAttribute('aria-selected', String(sp.dataset.mtab === t[0])); b.onclick = function () { sp.dataset.mtab = t[0]; bar.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); }); if (t[0] === 'term') { var i = $('lrIn'); if (i) i.focus(); } }; bar.appendChild(b); });
    sp.parentNode.insertBefore(bar, sp);
  }

  function tick() { hero(); navBtn(); cards(); progress(); mtabs(); }
  document.addEventListener('DOMContentLoaded', tick); tick();
  var q = 0; new MutationObserver(function () { if (q) return; q = requestAnimationFrame(function () { q = 0; tick(); }); }).observe(document.body, { childList: true, subtree: true });
})();

/* Daily challenge: one fault lab per calendar day (local date), streak, 14-day history. Fully offline. */
(function () {
  'use strict';
  var KL = window.KL, Labs = KL.Labs, $ = function (id) { return document.getElementById(id); };
  var KEY = 'kl.daily';
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function dkey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function hash(s) { var h = 2166136261 >>> 0, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function pool() { return Labs.list.filter(function (l) { return KL.predictable && KL.predictable(l) && parseInt(l.time, 10) <= 15; }); }
  function pickFor(d) {
    var p = pool(); if (!p.length) return null; var y = new Date(d); y.setDate(y.getDate() - 1);
    var i = hash(dkey(d)) % p.length, j = hash(dkey(y)) % p.length; if (i === j) i = (i + 1) % p.length; return p[i];
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var D = KL.daily = {
    today: function () { var l = pickFor(new Date()); return { id: l ? l.id : '', key: dkey() }; },
    done: function () { return !!load()[dkey()]; },
    record: function (id, secs) { var t = D.today(); if (id !== t.id) return; var d = load(); if (!d[t.key]) { d[t.key] = { id: id, secs: secs }; save(d); D.render(); } },
    streak: function () { var d = load(), n = 0, c = new Date(); if (!d[dkey(c)]) c.setDate(c.getDate() - 1); while (d[dkey(c)]) { n++; c.setDate(c.getDate() - 1); } return n; },
    render: function () {
      var host = $('dailyCard'); if (!host) return; var lab = pickFor(new Date()); if (!lab) { host.innerHTML = ''; return; }
      var d = load(), done = !!d[dkey()], dots = '', c = new Date(), i; c.setDate(c.getDate() - 13);
      for (i = 0; i < 14; i++) { dots += '<i class="' + (d[dkey(c)] ? 'on' : '') + '" title="' + dkey(c) + '"></i>'; c.setDate(c.getDate() + 1); }
      var nx = new Date(); nx.setHours(24, 0, 0, 0); var hrs = Math.max(1, Math.ceil((nx - Date.now()) / 3600000));
      host.innerHTML = '<div class="daily ' + (done ? 'done' : '') + '"><div class="daily-l"><span class="daily-tag">📅 Daily challenge</span><b>' + esc(lab.num + ' · ' + lab.title) + '</b><span class="daily-m">' + esc(lab.diff) + ' · ⏱ ' + esc(lab.time) + ' · ' + esc(lab.track.join('/')) + '</span></div>' +
        '<div class="daily-r"><div class="daily-dots" aria-label="Last 14 days">' + dots + '</div><span class="daily-s">🔥 ' + D.streak() + '-day streak' + (done ? ' · ✓ done in ' + Math.floor(d[dkey()].secs / 60) + 'm ' + (d[dkey()].secs % 60) + 's · next in ~' + hrs + 'h' : '') + '</span>' +
        '<a class="btn-primary" href="#lab/' + lab.id + '">' + (done ? 'Replay' : 'Start today\'s challenge') + '</a></div></div>';
    }
  };
  KL.route('labs', D.render);
  window.addEventListener('kl:store', D.render);
  document.addEventListener('DOMContentLoaded', D.render);
  D.render();
})();

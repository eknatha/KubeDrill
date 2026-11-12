/* KubeDrill progress store — 100% local (localStorage). No accounts, no network.
   Falls back to in-memory if storage is blocked. Exportable/importable as JSON. */
(function (root) {
  'use strict';
  var KEY = 'kubedrill:v1';
  var mem = null;
  var INTERVALS = [0, 1, 3, 7, 21]; // Leitner boxes, in days

  function blank() { return { v: 1, labs: {}, modules: {}, quiz: {}, exams: [], days: [], hints: {} }; }
  function load() {
    try { var r = root.localStorage && root.localStorage.getItem(KEY); if (r) { var d = JSON.parse(r); return Object.assign(blank(), d); } }
    catch (e) { /* ignore */ }
    return mem || blank();
  }
  var data = load();
  function save() {
    try { root.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { mem = data; }
    try { root.dispatchEvent && root.dispatchEvent(new CustomEvent('kl:store')); } catch (e) { /* node */ }
  }
  function today() { return new Date().toISOString().slice(0, 10); }

  var store = {
    data: function () { return data; },
    touchDay: function () { var t = today(); if (data.days.indexOf(t) < 0) { data.days.push(t); data.days = data.days.slice(-400); save(); } },
    streak: function () {
      var set = {}; data.days.forEach(function (d) { set[d] = 1; });
      var n = 0, d = new Date();
      if (!set[d.toISOString().slice(0, 10)]) d.setDate(d.getDate() - 1); // today not yet counted → allow yesterday
      while (set[d.toISOString().slice(0, 10)]) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
    labDone: function (id) { return !!(data.labs[id] && data.labs[id].done); },
    markLab: function (id, done) {
      var wasDone = store.labDone(id);
      data.labs[id] = Object.assign(data.labs[id] || {}, { done: done === false ? 0 : Date.now() });
      store.touchDay(); save(); return !wasDone && done !== false;
    },
    labTasks: function (id) { return (data.labs[id] && data.labs[id].tasks) || {}; },
    setLabTasks: function (id, tasks) { data.labs[id] = Object.assign(data.labs[id] || {}, { tasks: tasks }); save(); },
    hintsUsed: function (id) { return data.hints[id] || 0; },
    useHint: function (id) { data.hints[id] = (data.hints[id] || 0) + 1; save(); },
    moduleDone: function (n) { return !!data.modules[n]; },
    markModule: function (n, done) { if (done === false) delete data.modules[n]; else data.modules[n] = Date.now(); store.touchDay(); save(); },
    // ── quiz / spaced repetition
    qState: function (id) { return data.quiz[id] || null; },
    qRecord: function (id, correct) {
      var s = data.quiz[id] || { box: 0, seen: 0, wrong: 0, due: 0 };
      s.seen++; s.last = Date.now();
      if (correct) { s.box = Math.min(4, s.box + 1); } else { s.box = 0; s.wrong++; }
      s.due = Date.now() + INTERVALS[s.box] * 86400000;
      s.ok = !!correct; data.quiz[id] = s; store.touchDay(); save();
    },
    qDue: function (id) { var s = data.quiz[id]; return !!s && s.due <= Date.now(); },
    addExam: function (r) { data.exams.push(r); data.exams = data.exams.slice(-50); store.touchDay(); save(); },
    exportJSON: function () { return JSON.stringify(data, null, 2); },
    importJSON: function (txt) {
      var d = JSON.parse(txt);
      if (!d || typeof d !== 'object' || d.v !== 1) throw new Error('Not a KubeDrill progress file');
      data = Object.assign(blank(), d); save();
    },
    reset: function () { data = blank(); save(); },
    persistent: function () { try { root.localStorage.setItem('kubedrill:probe', '1'); root.localStorage.removeItem('kubedrill:probe'); return true; } catch (e) { return false; } }
  };

  root.KL = root.KL || {};
  root.KL.store = store;
  // tiny shared route dispatcher: KL.route('lab', fn(rest))
  if (!root.KL.route) {
    var routes = {};
    root.KL.route = function (name, fn) { (routes[name] = routes[name] || []).push(fn); };
    root.KL.onRoute = function (name, rest) { (routes[name] || []).forEach(function (f) { try { f(rest); } catch (e) { console.error(e); } }); (routes['*'] || []).forEach(function (f) { try { f(name, rest); } catch (e) { console.error(e); } }); };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = store;
})(typeof window !== 'undefined' ? window : globalThis);

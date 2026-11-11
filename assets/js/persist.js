/* Tiny async key-value store on IndexedDB (falls back to localStorage). Used for lab sessions so a refresh never loses work. */
(function () {
  'use strict';
  var KL = window.KL = window.KL || {}, DB = 'kubelab', ST = 'sessions', dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res) {
      if (!window.indexedDB) return res(null);
      try { var r = indexedDB.open(DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore(ST); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { res(null); }; r.onblocked = function () { res(null); }; } catch (e) { res(null); }
    });
    return dbp;
  }
  function tx(mode, fn) { return open().then(function (db) { return new Promise(function (res, rej) { if (!db) return rej(new Error('nodb')); var t = db.transaction(ST, mode), st = t.objectStore(ST), rq = fn(st); t.oncomplete = function () { res(rq && rq.result); }; t.onerror = t.onabort = function () { rej(t.error); }; }); }); }
  var LS = 'kubelab:sess:';
  KL.sessions = {
    save: function (k, v) { return tx('readwrite', function (s) { return s.put(v, k); }).catch(function () { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) { /* quota */ } }); },
    load: function (k) { return tx('readonly', function (s) { return s.get(k); }).then(function (v) { return v || null; }).catch(function () { try { return JSON.parse(localStorage.getItem(LS + k)); } catch (e) { return null; } }); },
    del: function (k) { try { localStorage.removeItem(LS + k); } catch (e) { /* ignore */ } return tx('readwrite', function (s) { return s.delete(k); }).catch(function () { /* ignore */ }); },
    keys: function () { return tx('readonly', function (s) { return s.getAllKeys(); }).then(function (k) { return k || []; }).catch(function () { return []; }); }
  };
  // ask the browser not to evict our data (Safari/iOS evicts idle sites after ~7 days)
  KL.persistStorage = function () { return (navigator.storage && navigator.storage.persist) ? navigator.storage.persist().catch(function () { return false; }) : Promise.resolve(false); };
})();

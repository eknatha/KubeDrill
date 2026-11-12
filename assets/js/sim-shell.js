/* KubeDrill simulator — tiny bash-like shell: pipes, redirects, heredocs, $VARS, $(...), && || ;
   plus a few coreutils. kubectl itself lives in sim-kubectl*.js */
(function (root) {
  'use strict';
  var Sim = root.KL ? root.KL.Sim : require('./sim.js');
  var P = Sim.prototype, KErr = Sim.KErr;

  // Does this text have an unterminated heredoc? (UI uses it to keep collecting lines)
  P.needsMore = function (text) {
    var lines = text.split('\n'), pending = null;
    for (var i = 0; i < lines.length; i++) {
      if (pending) { if (lines[i].trim() === pending) pending = null; continue; }
      var m = lines[i].match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/);
      if (m) pending = m[1];
    }
    return !!pending;
  };

  P.tokenize = function (line, depth) {
    var self = this, toks = [], cur = '', has = false, i = 0, q = null;
    function push() { if (has) toks.push({ w: cur }); cur = ''; has = false; }
    function expandVar(s, j) { // s[j] === '$'
      var m;
      if (s[j + 1] === '(') {
        var d = 1, k = j + 2; while (k < s.length && d) { if (s[k] === '(') d++; else if (s[k] === ')') d--; k++; }
        var inner = s.slice(j + 2, k - 1), r = self.exec(inner, (depth || 0) + 1);
        return [(r.stdout || '').replace(/\n+$/, ''), k];
      }
      if ((m = s.slice(j + 1).match(/^\{?([A-Za-z_][A-Za-z0-9_]*)\}?/))) return [self.env[m[1]] || '', j + 1 + m[0].length];
      return ['$', j + 1];
    }
    while (i < line.length) {
      var ch = line[i];
      if (q === "'") { if (ch === "'") q = null; else cur += ch; i++; continue; }
      if (q === '"') {
        if (ch === '"') { q = null; i++; continue; }
        if (ch === '\\' && /["\\$`]/.test(line[i + 1] || '')) { cur += line[i + 1]; i += 2; continue; }
        if (ch === '$') { var r = expandVar(line, i); cur += r[0]; i = r[1]; continue; }
        cur += ch; i++; continue;
      }
      if (ch === "'" || ch === '"') { q = ch; has = true; i++; continue; }
      if (ch === '\\') { if (line[i + 1] === '\n') { i += 2; continue; } cur += line[i + 1] || ''; has = true; i += 2; continue; }
      if (ch === '#' && !has) break;
      if (ch === '$') { // unquoted expansion undergoes word splitting, like bash ($do, $(kubectl get ... -o name))
        var r2 = expandVar(line, i), val = r2[0]; i = r2[1];
        if (/\s/.test(val)) val.split(/(\s+)/).forEach(function (part) { if (/^\s+$/.test(part)) push(); else if (part) { cur += part; has = true; } });
        else if (val !== '') { cur += val; has = true; }
        else if (r2[0] === '' && line[i - 1] !== '$') { /* empty expansion vanishes */ }
        continue;
      }
      if (ch === '~' && !has && (line[i + 1] === '/' || line[i + 1] === undefined || line[i + 1] === ' ')) { cur += '/home/student'; has = true; i++; continue; }
      if (/\s/.test(ch)) { push(); i++; continue; }
      var two = line.substr(i, 2);
      if (two === '&&' || two === '||' || two === '>>' || two === '<<' || two === '2>') {
        if (two === '2>' && line[i + 2] === '&') { push(); toks.push({ op: '2>&1' }); i += 4; continue; }
        push(); if (two === '<<' && line[i + 2] === '-') { toks.push({ op: '<<' }); i += 3; } else { toks.push({ op: two }); i += 2; } continue;
      }
      if (ch === '|' || ch === ';' || ch === '>' || ch === '<') { push(); toks.push({ op: ch }); i++; continue; }
      cur += ch; has = true; i++;
    }
    push(); return toks;
  };

  // run a whole script (may contain heredocs and several lines)
  P.exec = function (script, depth) {
    depth = depth || 0; if (depth > 5) return { stdout: '', stderr: 'shell: too deep', code: 1 };
    var lines = String(script).split('\n'), out = '', err = '', code = 0, i = 0, edit, applyOnSave;
    while (i < lines.length) {
      var line = lines[i++], hd = null, m = line.match(/<<-?\s*['"]?([A-Za-z_][A-Za-z0-9_]*)['"]?/);
      if (m) { var body = []; while (i < lines.length && lines[i].trim() !== m[1]) body.push(lines[i++]); i++; hd = body.join('\n') + '\n'; }
      if (!line.trim() || line.trim()[0] === '#') continue;
      var r = this.runLine(line, hd, depth);
      out += r.stdout; err += r.stderr; code = r.code; if (r.edit) { edit = r.edit; applyOnSave = r.applyOnSave; }
    }
    return { stdout: out, stderr: err, code: code, edit: edit, applyOnSave: applyOnSave };
  };

  P.runLine = function (line, heredoc, depth) {
    var toks = this.tokenize(line, depth), seqs = [], cur = [], i;
    for (i = 0; i < toks.length; i++) { var t = toks[i]; if (t.op === '&&' || t.op === '||' || t.op === ';') { seqs.push({ toks: cur, sep: t.op }); cur = []; } else cur.push(t); }
    seqs.push({ toks: cur, sep: null });
    var out = '', err = '', code = 0, prevSep = ';', edit, applyOnSave;
    for (i = 0; i < seqs.length; i++) {
      var run = prevSep === ';' || (prevSep === '&&' && code === 0) || (prevSep === '||' && code !== 0);
      if (run && seqs[i].toks.length) { var r = this.runPipeline(seqs[i].toks, heredoc); out += r.stdout; err += r.stderr; code = r.code; if (r.edit) { edit = r.edit; applyOnSave = r.applyOnSave; } }
      prevSep = seqs[i].sep;
    }
    return { stdout: out, stderr: err, code: code, edit: edit, applyOnSave: applyOnSave };
  };

  P.runPipeline = function (toks, heredoc) {
    var segs = [[]], i; toks.forEach(function (t) { if (t.op === '|') segs.push([]); else segs[segs.length - 1].push(t); });
    var stdin = null, err = '', last = { stdout: '', code: 0 };
    for (i = 0; i < segs.length; i++) {
      var words = [], redirOut = null, append = false, inFile = null, merge = false, hdUse = null, s = segs[i];
      for (var j = 0; j < s.length; j++) {
        var t = s[j];
        if (t.op === '>' || t.op === '>>') { redirOut = s[++j] && s[j].w; append = t.op === '>>'; }
        else if (t.op === '<') inFile = s[++j] && s[j].w;
        else if (t.op === '<<') { j++; hdUse = heredoc; }
        else if (t.op === '2>') { j++; }
        else if (t.op === '2>&1') merge = true;
        else if (t.w !== undefined) words.push(t.w);
      }
      var inp = stdin; if (hdUse !== null) inp = hdUse; if (inFile) { var c = this.readFile(inFile); inp = c === null ? '' : c; }
      var r = this.runCmd(words, inp);
      err += r.stderr || '';
      if (merge) { r.stdout = (r.stdout || '') + (r.stderr || ''); err = err.replace(r.stderr || '', ''); }
      if (redirOut) { if (redirOut !== '/dev/null') this.writeFile(redirOut, r.stdout || '', append); stdin = ''; last = { stdout: '', code: r.code }; }
      else { stdin = r.stdout || ''; last = r; }
    }
    return { stdout: last.stdout || '', stderr: err, code: last.code || 0, edit: last.edit, applyOnSave: last.applyOnSave };
  };

  var NOFILE = function (c, f) { return c + ': ' + f + ': No such file or directory\n'; };

  P.runCmd = function (w, stdin) {
    if (!w.length) return { stdout: '', stderr: '', code: 0 };
    var self = this, c = w[0], a = w.slice(1), ok = function (s) { return { stdout: s === undefined ? '' : s, stderr: '', code: 0 }; }, bad = function (s, code) { return { stdout: '', stderr: s, code: code || 1 }; };
    var m;
    if ((m = c.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)) && !a.length) { this.env[m[1]] = m[2]; return ok(); }
    if (c === 'k') c = 'kubectl';
    switch (c) {
      case 'kubectl': this.t += 0; var kr = this.kubectl(a, stdin); this.settle(1); return kr;
      case 'echo': { var nn = a[0] === '-n', e = a[0] === '-e'; if (nn || e) a = a.slice(1); var txt = a.join(' '); if (e) txt = txt.replace(/\\n/g, '\n').replace(/\\t/g, '\t'); return ok(txt + (nn ? '' : '\n')); }
      case 'printf': return ok((a[0] || '').replace(/\\n/g, '\n').replace(/\\t/g, '\t'));
      case 'true': return ok(); case 'false': return { stdout: '', stderr: '', code: 1 };
      case 'pwd': return ok(this.cwd + '\n');
      case 'whoami': return ok('student\n'); case 'hostname': return ok('kubedrill-workstation\n'); case 'date': return ok(new Date().toUTCString().replace('GMT', 'UTC') + '\n');
      case 'clear': return { stdout: '', stderr: '', code: 0, clear: true };
      case 'exit': case 'logout': return ok();
      case 'export': a.forEach(function (x) { var mm = x.match(/^([^=]+)=(.*)$/); if (mm) self.env[mm[1]] = mm[2]; }); return ok();
      case 'alias': case 'source': case 'complete': case 'set': case 'unset': case 'history': return ok();
      case 'env': case 'printenv': return ok(Object.keys(this.env).map(function (k) { return k + '=' + self.env[k]; }).join('\n') + '\n');
      case 'sleep': { var n = parseFloat(a[0]) || 0; this.settle(Math.min(60, Math.ceil(n))); return ok(); }
      case 'cd': { var d = this.abs(a[0] || '~'); if (!this.isDir(d)) return bad('bash: cd: ' + (a[0] || '') + ': No such file or directory\n'); this.cwd = d; return ok(); }
      case 'mkdir': a.filter(function (x) { return x[0] !== '-'; }).forEach(function (x) { self.fs[self.abs(x) + '/.keep'] = ''; }); this.changed(); return ok();
      case 'touch': a.forEach(function (x) { var ab = self.abs(x); if (!(ab in self.fs)) self.fs[ab] = ''; }); this.changed(); return ok();
      case 'ls': {
        var paths = a.filter(function (x) { return x[0] !== '-'; }), p0 = paths[0] || '.', ab = this.abs(p0), names = {};
        if (ab in this.fs) return ok(p0 + '\n');
        if (!this.isDir(ab)) return bad("ls: cannot access '" + p0 + "': No such file or directory\n", 2);
        var pre = ab === '/' ? '/' : ab + '/'; Object.keys(this.fs).forEach(function (k) { if (k.indexOf(pre) === 0) { var rest = k.slice(pre.length).split('/')[0]; if (rest !== '.keep') names[rest] = 1; } });
        return ok(Object.keys(names).sort().join('\n') + (Object.keys(names).length ? '\n' : ''));
      }
      case 'cat': {
        if (!a.length) return ok(stdin || ''); var o = '';
        for (var i = 0; i < a.length; i++) { var f = this.readFile(a[i]); if (f === null) return bad(NOFILE('cat', a[i]).replace(/\n$/, '') + '\n'); o += f; }
        return ok(o);
      }
      case 'rm': a.filter(function (x) { return x[0] !== '-'; }).forEach(function (x) { var ab = self.abs(x); Object.keys(self.fs).forEach(function (k) { if (k === ab || k.indexOf(ab + '/') === 0) delete self.fs[k]; }); }); this.changed(); return ok();
      case 'cp': case 'mv': { var f2 = a.filter(function (x) { return x[0] !== '-'; }); var src = this.readFile(f2[0]); if (src === null) return bad(c + ": cannot stat '" + f2[0] + "': No such file or directory\n"); this.writeFile(f2[1], src); if (c === 'mv') delete this.fs[this.abs(f2[0])]; return ok(); }
      case 'vi': case 'vim': case 'nano': { var ap = this.abs(a[0] || 'file'); if (!(ap in this.fs)) this.fs[ap] = ''; return { stdout: '', stderr: '', code: 0, edit: ap }; }
      case 'grep': return this.grep(a, stdin);
      case 'wc': { var t = stdin || ''; var lines = t ? t.replace(/\n$/, '').split('\n').length : 0; if (a.indexOf('-l') >= 0) return ok(lines + '\n'); if (a.indexOf('-c') >= 0) return ok(t.length + '\n'); if (a.indexOf('-w') >= 0) return ok(t.split(/\s+/).filter(Boolean).length + '\n'); return ok(lines + ' ' + t.split(/\s+/).filter(Boolean).length + ' ' + t.length + '\n'); }
      case 'head': case 'tail': {
        var nIdx = a.indexOf('-n'), cnt = 10, files = []; a.forEach(function (x, ix) { if (/^-\d+$/.test(x)) cnt = -parseInt(x, 10); else if (ix === nIdx + 1 && nIdx >= 0) cnt = parseInt(x, 10); else if (x[0] !== '-') files.push(x); });
        var body = files.length ? this.readFile(files[0]) : stdin; if (body === null) return bad(NOFILE(c, files[0]));
        var ls = body.replace(/\n$/, '').split('\n'); return ok((c === 'head' ? ls.slice(0, cnt) : ls.slice(-cnt)).join('\n') + '\n');
      }
      case 'sort': { var ls2 = (stdin || '').replace(/\n$/, '').split('\n'); ls2.sort(); if (a.indexOf('-r') >= 0) ls2.reverse(); return ok(ls2.join('\n') + '\n'); }
      case 'uniq': { var ls3 = (stdin || '').replace(/\n$/, '').split('\n').filter(function (x, ix, ar) { return ix === 0 || ar[ix - 1] !== x; }); return ok(ls3.join('\n') + '\n'); }
      case 'tr': { var from = (a[0] || '').replace(/\[:upper:\]/, 'A-Z').replace(/\[:lower:\]/, 'a-z'), to = (a[1] || ''); if (a[0] === '-d') return ok((stdin || '').split(a[1]).join('')); if (from === 'A-Z' && to === 'a-z') return ok((stdin || '').toLowerCase()); if (from === 'a-z' && to === 'A-Z') return ok((stdin || '').toUpperCase()); return ok(stdin || ''); }
      case 'cut': { var di = a.indexOf('-d'), fi = a.indexOf('-f'); var dl = di >= 0 ? a[di + 1] : '\t', fn = fi >= 0 ? parseInt(a[fi + 1], 10) : 1; return ok((stdin || '').replace(/\n$/, '').split('\n').map(function (l) { return l.split(dl)[fn - 1] || ''; }).join('\n') + '\n'); }
      case 'awk': { var mm2 = (a[0] || '').match(/\{print \$(\d+)\}/); if (!mm2) return bad('awk: only {print $N} is supported in the simulator\n'); var nth = parseInt(mm2[1], 10); return ok((stdin || '').replace(/\n$/, '').split('\n').map(function (l) { return nth === 0 ? l : (l.trim().split(/\s+/)[nth - 1] || ''); }).join('\n') + '\n'); }
      case 'base64': { var dec = a.indexOf('-d') >= 0 || a.indexOf('--decode') >= 0, inp = (stdin || a.filter(function (x) { return x[0] !== '-'; }).join(' ')).replace(/\n$/, ''); try { return ok(dec ? (typeof Buffer !== 'undefined' ? Buffer.from(inp, 'base64').toString() : decodeURIComponent(escape(atob(inp)))) + (a.indexOf('-n') >= 0 ? '' : '') : (typeof Buffer !== 'undefined' ? Buffer.from(inp).toString('base64') : btoa(unescape(encodeURIComponent(inp)))) + '\n'); } catch (e) { return bad('base64: invalid input\n'); } }
      case 'sed': return this.sed(a, stdin);
      case 'curl': case 'wget': return this.hostNet(c, a);
      case 'trivy': return this.trivy(a);
      case 'etcdctl': return this.etcdctl(a);
      case 'help': return ok(this.helpText());
      case 'which': return ok('/usr/local/bin/' + (a[0] || '') + '\n');
      case 'kubeadm': return this.kubeadm(a);
      case 'ssh': return this.ssh(a);
      case 'sudo': return this.runCmd(a, stdin);
      case 'jq': return bad('jq: not installed in the simulator — use -o jsonpath or grep.\n');
      case 'yq': return bad('yq: not installed in the simulator.\n');
    }
    return bad('bash: ' + c + ': command not found\n', 127);
  };

  P.grep = function (a, stdin) {
    var flags = { i: 0, v: 0, c: 0, n: 0, E: 0, A: 0, B: 0, o: 0, w: 0, q: 0 }, args = [], i;
    for (i = 0; i < a.length; i++) {
      var x = a[i];
      if (/^-[A-Za-z]+$/.test(x)) { for (var k = 1; k < x.length; k++) { if (x[k] === 'A' || x[k] === 'B') { flags[x[k]] = parseInt(a[++i], 10); } else flags[x[k]] = 1; } }
      else if (/^-[AB]\d+$/.test(x)) flags[x[1]] = parseInt(x.slice(2), 10);
      else args.push(x);
    }
    var pat = args[0], files = args.slice(1), text = files.length ? this.readFile(files[0]) : stdin;
    if (text === null) return { stdout: '', stderr: 'grep: ' + files[0] + ': No such file or directory\n', code: 2 };
    var re; try { re = new RegExp(flags.w ? '\\b' + pat + '\\b' : pat, flags.i ? 'i' : ''); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.i ? 'i' : ''); }
    var ls = (text || '').replace(/\n$/, '').split('\n'), out = [], hit = {}, cnt = 0;
    ls.forEach(function (l, ix) { var h = re.test(l); if (flags.v) h = !h; if (h) { cnt++; for (var d = -flags.B; d <= flags.A; d++) if (ix + d >= 0 && ix + d < ls.length) hit[ix + d] = 1; } });
    if (flags.c) return { stdout: cnt + '\n', stderr: '', code: cnt ? 0 : 1 };
    Object.keys(hit).map(Number).sort(function (p, q) { return p - q; }).forEach(function (ix) { out.push((flags.n ? (ix + 1) + ':' : '') + (flags.o ? ((ls[ix].match(re) || [''])[0]) : ls[ix])); });
    return { stdout: out.length ? out.join('\n') + '\n' : '', stderr: '', code: cnt ? 0 : 1 };
  };
  P.sed = function (a, stdin) {
    var inplace = a.indexOf('-i') >= 0, rest = a.filter(function (x) { return x !== '-i' && x !== '-e'; }), expr = rest[0], file = rest[1], m = (expr || '').match(/^s(.)(.*?)\1(.*?)\1([gi]*)$/);
    if (!m) return { stdout: '', stderr: 'sed: simulator supports only s/old/new/[g] and -i\n', code: 1 };
    var text = file ? this.readFile(file) : stdin; if (text === null) return { stdout: '', stderr: 'sed: can\'t read ' + file + ': No such file or directory\n', code: 2 };
    var rep = m[3].replace(/\$/g, '$$$$').replace(/\\n/g, '\n').replace(/\\([1-9])/g, '$$$1').replace(/(^|[^\\])&/g, '$1$$&'), re = new RegExp(m[2], m[4]), out = text.split('\n').map(function (l) { return l.replace(re, rep); }).join('\n');
    if (inplace && file) { this.writeFile(file, out); return { stdout: '', stderr: '', code: 0 }; }
    return { stdout: out, stderr: '', code: 0 };
  };
  P.hostNet = function (c, a) { // curl/wget from the student's workstation
    var url = a.filter(function (x) { return x[0] !== '-'; }).pop() || '', m = url.match(/^(?:https?:\/\/)?([^:\/]+)(?::(\d+))?/);
    if (!m) return { stdout: '', stderr: c + ': no URL\n', code: 1 };
    var host = m[1], port = parseInt(m[2] || '80', 10), self = this;
    var np = this.list('Service').filter(function (s) { return (s.spec.ports || []).some(function (p) { return p.nodePort === port; }); })[0];
    if (np && (host === 'localhost' || /^192\.168\.49\./.test(host) || host === '127.0.0.1')) {
      var eps = this.endpointsFor(np); if (!eps.length) return { stdout: '', stderr: 'curl: (7) Failed to connect to ' + host + ' port ' + port + ': Connection refused\n', code: 7 };
      var repo = eps[0].spec.containers[0].image; return { stdout: /nginx/.test(repo) ? '<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n' : 'OK\n', stderr: '', code: 0 };
    }
    void self; return { stdout: '', stderr: 'curl: (7) Failed to connect to ' + host + ' port ' + port + ': Connection refused\n', code: 7 };
  };
  P.trivy = function (a) {
    var img = a.filter(function (x) { return x[0] !== '-' && x !== 'image'; })[0]; if (!img) return { stdout: '', stderr: 'trivy: image name required\n', code: 1 };
    var key = img.replace(/^docker\.io\/(library\/)?/, ''), v = Sim.util.VULNS[key];
    if (!v) { var prob = Sim.util.imageProblem(img); if (prob) return { stdout: '', stderr: 'FATAL\tunable to find the specified image "' + img + '"\n', code: 1 }; v = { crit: 3, high: 12, med: 30 }; }
    return { stdout: img + ' (debian 12)\n===================\nTotal: ' + (v.crit + v.high + v.med) + ' (MEDIUM: ' + v.med + ', HIGH: ' + v.high + ', CRITICAL: ' + v.crit + ')\n(simulated scan results — illustrative only)\n', stderr: '', code: 0 };
  };
  P.etcdctl = function (a) {
    if (a[0] === 'snapshot' && a[1] === 'save' && a[2]) { this.writeFile(a[2], JSON.stringify({ etcd: 'snapshot', rev: this.t, objs: Object.keys(this.objs).length })); return { stdout: 'Snapshot saved at ' + a[2] + '\n', stderr: '', code: 0 }; }
    if (a[0] === 'snapshot' && a[1] === 'status') { var f = this.readFile(a[2] || ''); if (f === null) return { stdout: '', stderr: 'Error: open ' + a[2] + ': no such file or directory\n', code: 1 }; return { stdout: 'abcd1234, ' + this.t + ', ' + Object.keys(this.objs).length + ', 4.1 MB\n', stderr: '', code: 0 }; }
    return { stdout: 'The simulator supports: etcdctl snapshot save <file> | snapshot status <file>.\nRestore is a node-level operation — use the kind lab pack for the full restore workflow.\n', stderr: '', code: 0 };
  };
  P.kubeadm = function (a) {
    if (a[0] === 'version') return { stdout: 'kubeadm version: &version.Info{Major:"1", Minor:"34", GitVersion:"' + Sim.VERSION + '"}\n', stderr: '', code: 0 };
    if (a[0] === 'upgrade' && a[1] === 'plan') return { stdout: '[upgrade] Fetching available versions to upgrade to\nComponents that must be upgraded manually after you have upgraded the control plane with \'kubeadm upgrade apply\':\nCOMPONENT   NODE      CURRENT   TARGET\nkubelet     worker1   ' + Sim.VERSION + '   (next minor)\n(simulated output — node upgrades are covered in the Cluster Lifecycle module)\n', stderr: '', code: 0 };
    return { stdout: 'kubeadm is simulated read-only here (version, upgrade plan).\n', stderr: '', code: 0 };
  };
  P.helpText = function () {
    return 'KubeDrill simulator shell — a small bash + kubectl that runs entirely in your browser.\n\n' +
      '  kubectl (alias k)   get describe create apply delete run expose scale set rollout logs exec label annotate taint cordon drain top auth can-i patch edit wait explain api-resources ...\n' +
      '  shell               echo cat ls cd mkdir rm cp mv touch grep sed(s///) head tail wc sort uniq cut awk(print $N) base64 tr\n' +
      '  editing             vi/nano <file> opens the editor; or: cat > f.yaml <<EOF ... EOF\n' +
      '  security/ops        trivy image <img> · etcdctl snapshot save|status · kubeadm version|upgrade plan\n' +
      '  tips                pipes, > >> redirects, $(...) and $VARS work. Tab completes kubectl verbs. Up/Down = history.\n' +
      '                      kubectl apply -f - <<EOF  ...  EOF  also works.\n';
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Sim;
})(typeof window !== 'undefined' ? window : globalThis);

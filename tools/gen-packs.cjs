// Generates lab-packs/<lab-id>/{README.md,setup.sh,check.sh,reset.sh} from the SAME specs the browser uses. Run: node tools/gen-packs.cjs
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..'), out = path.join(root, 'lab-packs');
global.window = undefined; const Labs = require(path.join(root, 'assets/js/labs-engine.js'));
fs.readdirSync(path.join(root, 'assets/js/data')).filter(f => /^labs-sim-.*\.js$/.test(f)).sort().forEach(f => require(path.join(root, 'assets/js/data', f)));
const PL = Labs.list.filter(l => !l.simOnly);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
PL.forEach(l => { const d = path.join(out, l.id); fs.mkdirSync(d); const pack = Labs.genPack(l); Object.keys(pack).forEach(n => { fs.writeFileSync(path.join(d, n), pack[n], { mode: n.endsWith('.sh') ? 0o755 : 0o644 }); }); });
const runner = [
  '#!/usr/bin/env bash',
  '# Run KubeLab labs on a real local cluster (kind). Usage:',
  '#   ./kubelab.sh cluster          create a kind cluster "kubelab" (1 control-plane + 2 workers)',
  '#   ./kubelab.sh list             list labs',
  '#   ./kubelab.sh setup  <lab-id>  break the environment',
  '#   ./kubelab.sh check  <lab-id>  run the checks',
  '#   ./kubelab.sh reset  <lab-id>  remove the lab namespace(s)',
  '#   ./kubelab.sh delete           delete the kind cluster',
  'set -euo pipefail',
  'here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
  'case "${1:-}" in',
  '  cluster)',
  '    command -v kind >/dev/null || { echo "install kind first: https://kind.sigs.k8s.io"; exit 1; }',
  '    printf "kind: Cluster\\napiVersion: kind.x-k8s.io/v1alpha4\\nnodes: [{role: control-plane}, {role: worker}, {role: worker}]\\n" | kind create cluster --name kubelab --config -',
  '    echo "Note: nodes are named kubelab-worker and kubelab-worker2 (labs say worker1/worker2)." ;;',
  "  list) ls -1 \"$here\" | grep -E '^s[0-9]+-' ;;",
  '  setup|check|reset) [ -d "$here/${2:?lab id}" ] || { echo "unknown lab"; exit 1; }; bash "$here/$2/$1.sh" ;;',
  '  delete) kind delete cluster --name kubelab ;;',
  "  *) sed -n '2,9p' \"$0\" ;;",
  'esac', ''].join('\n');
fs.writeFileSync(path.join(out, 'kubelab.sh'), runner, { mode: 0o755 });
fs.writeFileSync(path.join(out, 'README.md'), [
  '# KubeLab lab packs (real cluster)', '',
  'Every interactive lab in the browser is also exported here as plain bash + kubectl, generated from the same lab specs, so you can run it on a **real** cluster (kind, minikube, k3d, a homelab).', '',
  '```bash', 'cd lab-packs', './kubelab.sh cluster          # optional: needs Docker + kind', './kubelab.sh setup s02-imagepull', '# ...fix it with kubectl...', './kubelab.sh check s02-imagepull', './kubelab.sh reset s02-imagepull', '```', '',
  'Notes', '- Scripts use your **current kubectl context** — never run them against a production cluster. They create and delete the lab namespaces.',
  '- Labs that mention `worker1`/`worker2` (drain/cordon/label) need those node names: on kind they are `kubelab-worker`/`kubelab-worker2` — substitute them.',
  '- Check scripts assert the same end state as the in-browser Check button. Real clusters converge slower: re-run `check.sh` after a few seconds.',
  '- These packs are generated, and have been syntax-checked (`bash -n`) but **not every lab has been run end-to-end against a real cluster** — please open an issue if one misbehaves.', '',
  '## Labs (' + PL.length + ')', '', '| Lab | Level | Tracks | Time |', '|---|---|---|---|',
  PL.map(l => '| [' + l.num + ' ' + l.title + '](' + l.id + '/README.md) | ' + l.diff + ' | ' + l.track.join(', ') + ' | ' + l.time + ' |').join('\n'), ''].join('\n'));
console.log('packs:', PL.length);

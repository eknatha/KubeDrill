#!/usr/bin/env bash
# KubeLab lab pack: Bind a PVC to a pre-created PersistentVolume (s44-static-pv)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: PVC `archive` (2Gi, class manual)'
chk 'PVC `archive` (2Gi, class manual)' 'kubectl get pvc/archive -n pvs >/dev/null 2>&1'
echo 'Task 2: PVC Bound to archive-pv'
chk 'PVC Bound to archive-pv' '[ "$(kubectl get pvc/archive -n pvs -o jsonpath='\''{.status.phase}'\'' 2>/dev/null)" = '\''Bound'\'' ] && [ "$(kubectl get pvc/archive -n pvs -o jsonpath='\''{.spec.volumeName}'\'' 2>/dev/null)" = '\''archive-pv'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

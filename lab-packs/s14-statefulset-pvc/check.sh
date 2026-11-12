#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet: scale with stable storage (s14-statefulset-pvc)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Scale `kv` to 3 replicas'
chk 'Scale `kv` to 3 replicas' '[ "$(kubectl get pods -n db -l app=kv -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo 'Task 2: Three PVCs exist (data-kv-0..2)'
chk 'Three PVCs exist (data-kv-0..2)' 'kubectl get pvc/data-kv-2 -n db >/dev/null 2>&1 && [ "$(kubectl get PersistentVolumeClaim -n db --no-headers 2>/dev/null | wc -l)" -ge 3 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

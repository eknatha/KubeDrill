#!/usr/bin/env bash
# KubeDrill lab pack: Canary release: 20% of traffic via replica ratio (s60-canary-weights)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Scale the canary down to 1'
chk 'Scale the canary down to 1' '[ "$(kubectl get deploy/canary -n can -o jsonpath='\''{.spec.replicas}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo 'Task 2: Scale stable up to 4 — 5 Ready pods total'
chk 'Scale stable up to 4 — 5 Ready pods total' '[ "$(kubectl get deploy/stable -n can -o jsonpath='\''{.spec.replicas}'\'' 2>/dev/null)" = '\''4'\'' ] && [ "$(kubectl get pods -n can -l app=shop -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 5 ] && [ "$(kubectl get pods -n can -l app=shop -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -le 5 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

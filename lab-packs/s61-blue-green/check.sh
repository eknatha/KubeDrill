#!/usr/bin/env bash
# KubeDrill lab pack: Blue/green switch by Service selector (s61-blue-green)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Switch the selector to green'
chk 'Switch the selector to green' '[ "$(kubectl get svc/live -n bg -o jsonpath='\''{.spec.selector.track}'\'' 2>/dev/null)" = '\''green'\'' ] && [ "$(kubectl get endpoints live -n bg -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 2 ]'
echo 'Task 2: Scale blue to 0 (kept for rollback)'
chk 'Scale blue to 0 (kept for rollback)' '[ "$(kubectl get deploy/blue -n bg -o jsonpath='\''{.spec.replicas}'\'' 2>/dev/null)" = '\''0'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

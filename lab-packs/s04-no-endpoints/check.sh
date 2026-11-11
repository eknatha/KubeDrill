#!/usr/bin/env bash
# KubeLab lab pack: Service has no endpoints (s04-no-endpoints)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Show that the Service has no endpoints'
chk 'Show that the Service has no endpoints' '[ "$(kubectl get svc/frontend-svc -n store -o jsonpath='\''{.spec.selector.app}'\'' 2>/dev/null)" = '\''frontend'\'' ]'
echo 'Task 2: Fix the selector → ≥2 endpoints'
chk 'Fix the selector → ≥2 endpoints' '[ "$(kubectl get endpoints frontend-svc -n store -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 2 ]'
echo 'Task 3: Curl the Service from the tester pod'
chk 'Curl the Service from the tester pod' 'kubectl exec -n store tester -- wget -qO- -T 3 frontend-svc:80 >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

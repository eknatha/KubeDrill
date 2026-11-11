#!/usr/bin/env bash
# KubeLab lab pack: Ingress: host + path routing (s19-ingress)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Ingress `shop` exists with host shop.local'
chk 'Ingress `shop` exists with host shop.local' '[ "$(kubectl get ingress/shop -n shop -o jsonpath='\''{.spec.rules[0].host}'\'' 2>/dev/null)" = '\''shop.local'\'' ]'
echo 'Task 2: Both backends referenced'
chk 'Both backends referenced' 'echo "$(kubectl get ingress/shop -n shop -o jsonpath='\''{.spec.rules[0].http.paths[*].backend.service.name}'\'' 2>/dev/null)" | grep -q -- '\''api'\'' && echo "$(kubectl get ingress/shop -n shop -o jsonpath='\''{.spec.rules[0].http.paths[*].backend.service.name}'\'' 2>/dev/null)" | grep -q -- '\''web'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

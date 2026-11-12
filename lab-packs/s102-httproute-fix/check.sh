#!/usr/bin/env bash
# KubeLab lab pack: Gateway API: the route attaches to nothing (s102-httproute-fix)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Route attaches to Gateway `public`'
chk 'Route attaches to Gateway `public`' '[ "$(kubectl get httproute/shop -n gw2 -o jsonpath='\''{.spec.parentRefs[0].name}'\'' 2>/dev/null)" = '\''public'\'' ]'
echo 'Task 2: Backend port matches the Service (80)'
chk 'Backend port matches the Service (80)' '[ "$(kubectl get httproute/shop -n gw2 -o jsonpath='\''{.spec.rules[0].backendRefs[0].port}'\'' 2>/dev/null)" = '\''80'\'' ]'
echo 'Task 3: Hostname and a single Gateway kept'
chk 'Hostname and a single Gateway kept' '[ "$(kubectl get httproute/shop -n gw2 -o jsonpath='\''{.spec.hostnames[0]}'\'' 2>/dev/null)" = '\''shop.local'\'' ] && [ "$(kubectl get Gateway -n gw2 --no-headers 2>/dev/null | wc -l)" -ge 1 ] && [ "$(kubectl get Gateway -n gw2 --no-headers 2>/dev/null | wc -l)" -le 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

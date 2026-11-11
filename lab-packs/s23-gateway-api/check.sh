#!/usr/bin/env bash
# KubeLab lab pack: Gateway API: Gateway + HTTPRoute (s23-gateway-api)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create Gateway `public`'
chk 'Create Gateway `public`' '[ "$(kubectl get gateway/public -n gw -o jsonpath='\''{.spec.gatewayClassName}'\'' 2>/dev/null)" = '\''nginx'\'' ]'
echo 'Task 2: Create HTTPRoute `web-route`'
chk 'Create HTTPRoute `web-route`' '[ "$(kubectl get httproute/web-route -n gw -o jsonpath='\''{.spec.parentRefs[0].name}'\'' 2>/dev/null)" = '\''public'\'' ] && [ "$(kubectl get httproute/web-route -n gw -o jsonpath='\''{.spec.rules[0].backendRefs[0].name}'\'' 2>/dev/null)" = '\''web'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

#!/usr/bin/env bash
# KubeLab lab pack: Service unreachable: climb the ladder (s84-service-ladder)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Service selects the pods'
chk 'Service selects the pods' '[ "$(kubectl get endpoints web -n store -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 2 ]'
echo 'Task 2: Service targets the real container port'
chk 'Service targets the real container port' '[ "$(kubectl get service/web -n store -o jsonpath='\''{.spec.ports[0].targetPort}'\'' 2>/dev/null)" = '\''80'\'' ]'
echo 'Task 3: Allow the traffic, keep default-deny'
chk 'Allow the traffic, keep default-deny' 'kubectl exec -n store tester -- wget -qO- -T 3 web:80 >/dev/null 2>&1 && kubectl get networkpolicy/default-deny -n store >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

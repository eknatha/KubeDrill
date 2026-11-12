#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet needs a headless Service (s43-headless-service)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Headless Service `store-hl`'
chk 'Headless Service `store-hl`' '[ "$(kubectl get svc/store-hl -n ss -o jsonpath='\''{.spec.clusterIP}'\'' 2>/dev/null)" = '\''None'\'' ]'
echo 'Task 2: Service selects both pods'
chk 'Service selects both pods' '[ "$(kubectl get endpoints store-hl -n ss -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

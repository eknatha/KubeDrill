#!/usr/bin/env bash
# KubeLab lab pack: Insufficient memory (s38-memory-too-high)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Request lowered'
chk 'Request lowered' '[ "$(kubectl get deploy/report -n mem -o jsonpath='\''{.spec.template.spec.containers[0].resources.requests.memory}'\'' 2>/dev/null)" = '\''128Mi'\'' ]'
echo 'Task 2: 2 pods Ready'
chk '2 pods Ready' '[ "$(kubectl get pods -n mem -l app=report -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

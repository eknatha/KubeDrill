#!/usr/bin/env bash
# KubeDrill lab pack: Pod-count quota blocks scaling (s48-quota-pods)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Quota raised to 6 pods'
chk 'Quota raised to 6 pods' '[ "$(kubectl get resourcequota/count -n qt -o jsonpath='\''{.spec.hard.pods}'\'' 2>/dev/null)" = '\''6'\'' ]'
echo 'Task 2: 5 replicas Ready'
chk '5 replicas Ready' '[ "$(kubectl get pods -n qt -l app=burst -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 5 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

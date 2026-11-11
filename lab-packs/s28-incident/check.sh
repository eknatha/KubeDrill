#!/usr/bin/env bash
# KubeLab lab pack: Incident: three faults, one outage (s28-incident)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: frontend pods Ready'
chk 'frontend pods Ready' '[ "$(kubectl get pods -n prod -l app=frontend -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 2: Service `frontend` has endpoints'
chk 'Service `frontend` has endpoints' '[ "$(kubectl get endpoints frontend -n prod -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 2 ]'
echo 'Task 3: api pods Ready'
chk 'api pods Ready' '[ "$(kubectl get pods -n prod -l app=api -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

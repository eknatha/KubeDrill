#!/usr/bin/env bash
# KubeDrill lab pack: Autoscale a Deployment with HPA (s16-hpa)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create the HPA'
chk 'Create the HPA' '[ "$(kubectl get hpa/shop -n web -o jsonpath='\''{.spec.maxReplicas}'\'' 2>/dev/null)" = '\''6'\'' ] && [ "$(kubectl get hpa/shop -n web -o jsonpath='\''{.spec.minReplicas}'\'' 2>/dev/null)" = '\''2'\'' ]'
echo 'Task 2: Deployment scaled up to the minimum'
chk 'Deployment scaled up to the minimum' '[ "$(kubectl get pods -n web -l app=shop -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

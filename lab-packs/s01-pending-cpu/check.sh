#!/usr/bin/env bash
# KubeDrill lab pack: Prod is down: pods stuck in Pending (s01-pending-cpu)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find why the pods are Pending'
chk 'Find why the pods are Pending' '[ -n "$(kubectl get deploy/api -n payments -o jsonpath='\''{.spec.template.spec.containers[0].resources.requests.cpu}'\'' 2>/dev/null)" ] && [ "$(kubectl get deploy/api -n payments -o jsonpath='\''{.spec.template.spec.containers[0].resources.requests.cpu}'\'' 2>/dev/null)" != '\''64'\'' ]'
echo 'Task 2: Get 2 Ready replicas of `api`'
chk 'Get 2 Ready replicas of `api`' '[ "$(kubectl get pods -n payments -l app=api -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

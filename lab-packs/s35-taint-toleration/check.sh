#!/usr/bin/env bash
# KubeDrill lab pack: Every node is tainted — add a toleration (s35-taint-toleration)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Deployment tolerates team=data:NoSchedule'
chk 'Deployment tolerates team=data:NoSchedule' '[ "$(kubectl get deploy/etl -n dedic -o jsonpath='\''{.spec.template.spec.tolerations[0].key}'\'' 2>/dev/null)" = '\''team'\'' ]'
echo 'Task 2: 2 pods Ready; taints untouched'
chk '2 pods Ready; taints untouched' '[ "$(kubectl get pods -n dedic -l app=etl -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ] && [ "$(kubectl get node/worker1 -o jsonpath='\''{.spec.taints[0].key}'\'' 2>/dev/null)" = '\''team'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

#!/usr/bin/env bash
# KubeDrill lab pack: NoExecute taint: evict, but spare the critical pod (s99-noexecute-eviction)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: `payments` tolerates the taint for 300 seconds'
chk '`payments` tolerates the taint for 300 seconds' '[ "$(kubectl get deploy/payments -n edge -o jsonpath='\''{.spec.template.spec.tolerations[0].tolerationSeconds}'\'' 2>/dev/null)" = '\''300'\'' ]'
echo 'Task 2: worker2 carries `retire=true:NoExecute`'
chk 'worker2 carries `retire=true:NoExecute`' '[ "$(kubectl get node/worker2 -o jsonpath='\''{.spec.taints[0].effect}'\'' 2>/dev/null)" = '\''NoExecute'\'' ]'
echo 'Task 3: Workloads still Ready'
chk 'Workloads still Ready' '[ "$(kubectl get pods -n edge -l app=payments -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ] && [ "$(kubectl get pods -n edge -l app=batch -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

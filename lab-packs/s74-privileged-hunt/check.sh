#!/usr/bin/env bash
# KubeLab lab pack: Hunt the privileged workloads (s74-privileged-hunt)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Stop ledger running privileged'
chk 'Stop ledger running privileged' '[ "$(kubectl get deployment/ledger -n payments -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.privileged}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo 'Task 2: Remove hostPID from reports'
chk 'Remove hostPID from reports' '[ "$(kubectl get deployment/reports -n payments -o jsonpath='\''{.spec.template.spec.hostPID}'\'' 2>/dev/null)" = '\'''\'' ]'
echo 'Task 3: Remove the docker.sock hostPath from cache'
chk 'Remove the docker.sock hostPath from cache' '[ "$(kubectl get deployment/cache -n payments -o jsonpath='\''{.spec.template.spec.volumes}'\'' 2>/dev/null)" = '\'''\'' ] && [ "$(kubectl get deployment/cache -n payments -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts}'\'' 2>/dev/null)" = '\'''\'' ]'
echo 'Task 4: Everything still running'
chk 'Everything still running' '[ "$(kubectl get pods -n payments -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

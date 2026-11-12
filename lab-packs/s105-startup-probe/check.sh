#!/usr/bin/env bash
# KubeLab lab pack: Slow starter: add a startup probe (s105-startup-probe)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Startup probe on `/`:80'
chk 'Startup probe on `/`:80' '[ "$(kubectl get deploy/legacy -n slow -o jsonpath='\''{.spec.template.spec.containers[0].startupProbe.httpGet.path}'\'' 2>/dev/null)" = '\''/'\'' ]'
echo 'Task 2: Allows 5 minutes (period 10 × threshold 30)'
chk 'Allows 5 minutes (period 10 × threshold 30)' '[ "$(kubectl get deploy/legacy -n slow -o jsonpath='\''{.spec.template.spec.containers[0].startupProbe.failureThreshold}'\'' 2>/dev/null)" = '\''30'\'' ] && [ "$(kubectl get deploy/legacy -n slow -o jsonpath='\''{.spec.template.spec.containers[0].startupProbe.periodSeconds}'\'' 2>/dev/null)" = '\''10'\'' ]'
echo 'Task 3: Liveness probe unchanged, pods Ready'
chk 'Liveness probe unchanged, pods Ready' '[ "$(kubectl get deploy/legacy -n slow -o jsonpath='\''{.spec.template.spec.containers[0].livenessProbe.periodSeconds}'\'' 2>/dev/null)" = '\''5'\'' ] && [ "$(kubectl get pods -n slow -l app=legacy -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

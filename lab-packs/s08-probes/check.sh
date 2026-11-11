#!/usr/bin/env bash
# KubeLab lab pack: Liveness and readiness probes (s08-probes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Fix the liveness probe of `site` (path /)'
chk 'Fix the liveness probe of `site` (path /)' '[ "$(kubectl get deploy/site -n probes -o jsonpath='\''{.spec.template.spec.containers[0].livenessProbe.httpGet.path}'\'' 2>/dev/null)" = '\''/'\'' ] && [ "$(kubectl get pods -n probes -l app=site -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 2: Fix the readiness probe port of `api` (80)'
chk 'Fix the readiness probe port of `api` (80)' '[ "$(kubectl get deploy/api -n probes -o jsonpath='\''{.spec.template.spec.containers[0].readinessProbe.httpGet.port}'\'' 2>/dev/null)" = '\''80'\'' ] && [ "$(kubectl get pods -n probes -l app=api -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

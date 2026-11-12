#!/usr/bin/env bash
# KubeDrill lab pack: Imperative speed run (CKAD style) (s66-imperative-speedrun)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Pod p1 with label tier=web'
chk 'Pod p1 with label tier=web' '[ "$(kubectl get pod/p1 -n fast -o jsonpath='\''{.metadata.labels.tier}'\'' 2>/dev/null)" = '\''web'\'' ]'
echo 'Task 2: Deployment api: httpd:2.4 × 3'
chk 'Deployment api: httpd:2.4 × 3' '[ "$(kubectl get pods -n fast -l app=api -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo 'Task 3: Service api-svc on port 80'
chk 'Service api-svc on port 80' '[ "$(kubectl get endpoints api-svc -n fast -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 3 ]'
echo 'Task 4: Job once completes'
chk 'Job once completes' '[ "$(kubectl get job/once -n fast -o jsonpath='\''{.status.succeeded}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

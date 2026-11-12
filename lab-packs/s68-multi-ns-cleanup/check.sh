#!/usr/bin/env bash
# KubeDrill lab pack: Clean up temporary namespaces by label (s68-multi-ns-cleanup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: List namespaces by label'
chk 'List namespaces by label' 'kubectl get namespace/prod >/dev/null 2>&1'
echo 'Task 2: All tmp-* namespaces deleted'
chk 'All tmp-* namespaces deleted' '! kubectl get namespace/tmp-1 >/dev/null 2>&1 && ! kubectl get namespace/tmp-2 >/dev/null 2>&1 && ! kubectl get namespace/tmp-3 >/dev/null 2>&1'
echo 'Task 3: prod and its Deployment still intact'
chk 'prod and its Deployment still intact' '[ "$(kubectl get pods -n prod -l app=core -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

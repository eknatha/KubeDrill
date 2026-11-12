#!/usr/bin/env bash
# KubeLab lab pack: Rollout strategy: never lose capacity (s107-rolling-strategy)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Strategy: RollingUpdate, surge 1, unavailable 0'
chk 'Strategy: RollingUpdate, surge 1, unavailable 0' '[ "$(kubectl get deploy/api -n rolls -o jsonpath='\''{.spec.strategy.rollingUpdate.maxSurge}'\'' 2>/dev/null)" = '\''1'\'' ] && [ "$(kubectl get deploy/api -n rolls -o jsonpath='\''{.spec.strategy.rollingUpdate.maxUnavailable}'\'' 2>/dev/null)" = '\''0'\'' ]'
echo 'Task 2: Image updated to nginx:1.26 and 4 pods Ready'
chk 'Image updated to nginx:1.26 and 4 pods Ready' '[ "$(kubectl get deploy/api -n rolls -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.26'\'' ] && [ "$(kubectl get pods -n rolls -l app=api -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 4 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

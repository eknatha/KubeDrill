#!/usr/bin/env bash
# KubeLab lab pack: Bad rollout: undo, scale, then upgrade (s06-rollout-rollback)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Roll back the broken rollout'
chk 'Roll back the broken rollout' '[ -n "$(kubectl get deploy/site -n release -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" ] && [ "$(kubectl get deploy/site -n release -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" != '\''nginx:1.99-bad'\'' ]'
echo 'Task 2: Scale to 4 replicas'
chk 'Scale to 4 replicas' '[ "$(kubectl get deploy/site -n release -o jsonpath='\''{.spec.replicas}'\'' 2>/dev/null)" = '\''4'\'' ]'
echo 'Task 3: Upgrade to nginx:1.27 with all 4 pods Ready'
chk 'Upgrade to nginx:1.27 with all 4 pods Ready' '[ "$(kubectl get deploy/site -n release -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.27'\'' ] && [ "$(kubectl get pods -n release -l app=site -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 4 ] && [ "$(kubectl get pods -n release -l app=site -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -le 4 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

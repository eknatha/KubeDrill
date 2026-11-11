#!/usr/bin/env bash
# KubeLab lab pack: Roll back to a specific revision (s39-rollout-revision)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Inspect the history'
chk 'Inspect the history' '[ -n "$(kubectl get deploy/shop -n rel -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" ] && [ "$(kubectl get deploy/shop -n rel -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" != '\''nginx:1.255'\'' ]'
echo 'Task 2: Running nginx:1.24 with 2 Ready pods'
chk 'Running nginx:1.24 with 2 Ready pods' '[ "$(kubectl get deploy/shop -n rel -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.24'\'' ] && [ "$(kubectl get pods -n rel -l app=shop -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

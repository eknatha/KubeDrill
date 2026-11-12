#!/usr/bin/env bash
# KubeDrill lab pack: LimitRange rejects the pod (s47-limitrange-max)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Understand the admission error'
chk 'Understand the admission error' '[ "$(kubectl get limitrange/caps -n lr -o jsonpath='\''{.spec.limits[0].max.cpu}'\'' 2>/dev/null)" = '\''500m'\'' ]'
echo 'Task 2: heavy runs 2 Ready pods within the cap'
chk 'heavy runs 2 Ready pods within the cap' '[ "$(kubectl get pods -n lr -l app=heavy -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

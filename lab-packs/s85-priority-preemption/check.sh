#!/usr/bin/env bash
# KubeDrill lab pack: Critical pods Pending: priority and preemption (s85-priority-preemption)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: See why payments is Pending'
chk 'See why payments is Pending' 'kubectl get priorityclass/critical >/dev/null 2>&1'
echo 'Task 2: Use the critical PriorityClass'
chk 'Use the critical PriorityClass' '[ "$(kubectl get deployment/payments -n batch -o jsonpath='\''{.spec.template.spec.priorityClassName}'\'' 2>/dev/null)" = '\''critical'\'' ]'
echo 'Task 3: payments Ready, filler survives partially'
chk 'payments Ready, filler survives partially' '[ "$(kubectl get pods -n batch -l app=payments -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ] && [ "$(kubectl get pods -n batch -l app=filler -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 4 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

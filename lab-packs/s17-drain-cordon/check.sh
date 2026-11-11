#!/usr/bin/env bash
# KubeLab lab pack: Node maintenance: cordon and drain (s17-drain-cordon)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Drain worker1'
chk 'Drain worker1' '[ "$(kubectl get node worker1 -o jsonpath='\''{.spec.unschedulable}'\'' 2>/dev/null)" = "true" ] && [ "$(kubectl get pods -n app --field-selector spec.nodeName=worker1 --no-headers 2>/dev/null | wc -l)" -eq 0 ]'
echo 'Task 2: All 4 replicas still Ready'
chk 'All 4 replicas still Ready' '[ "$(kubectl get pods -n app -l app=svc -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 4 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

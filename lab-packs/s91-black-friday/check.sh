#!/usr/bin/env bash
# KubeLab lab pack: Incident: Black Friday checkout (s91-black-friday)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Image: pods start'
chk 'Image: pods start' '[ "$(kubectl get deployment/checkout -n shop -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.25'\'' ]'
echo 'Task 2: Namespace budget: all 4 replicas can exist'
chk 'Namespace budget: all 4 replicas can exist' '[ "$(kubectl get pods -n shop -l app=checkout -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 4 ] && true'
echo 'Task 3: Service: it finds the pods'
chk 'Service: it finds the pods' '[ "$(kubectl get endpoints checkout -n shop -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 4 ]'
echo 'Task 4: End-to-end request works'
chk 'End-to-end request works' 'kubectl exec -n shop tester -- wget -qO- -T 3 checkout:80 >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

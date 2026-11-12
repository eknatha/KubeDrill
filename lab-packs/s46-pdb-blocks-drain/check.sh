#!/usr/bin/env bash
# KubeDrill lab pack: PodDisruptionBudget blocks a node drain (s46-pdb-blocks-drain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: PDB allows one disruption (minAvailable 2)'
chk 'PDB allows one disruption (minAvailable 2)' '[ "$(kubectl get pdb/guard -n maint -o jsonpath='\''{.spec.minAvailable}'\'' 2>/dev/null)" = '\''2'\'' ]'
echo 'Task 2: worker1 drained, 3 replicas still Ready'
chk 'worker1 drained, 3 replicas still Ready' '[ "$(kubectl get node worker1 -o jsonpath='\''{.spec.unschedulable}'\'' 2>/dev/null)" = "true" ] && [ "$(kubectl get pods -n maint --field-selector spec.nodeName=worker1 --no-headers 2>/dev/null | wc -l)" -eq 0 ] && [ "$(kubectl get pods -n maint -l app=guarded -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

#!/usr/bin/env bash
# KubeDrill lab pack: High availability: PDB + topology spread (s20-pdb-spread)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create PDB `checkout-pdb` with minAvailable 2'
chk 'Create PDB `checkout-pdb` with minAvailable 2' '[ "$(kubectl get pdb/checkout-pdb -n ha -o jsonpath='\''{.spec.minAvailable}'\'' 2>/dev/null)" = '\''2'\'' ]'
echo 'Task 2: Add topologySpreadConstraints (maxSkew 1)'
chk 'Add topologySpreadConstraints (maxSkew 1)' '[ "$(kubectl get deploy/checkout -n ha -o jsonpath='\''{.spec.template.spec.topologySpreadConstraints[0].maxSkew}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo 'Task 3: 3 replicas Ready'
chk '3 replicas Ready' '[ "$(kubectl get pods -n ha -l app=checkout -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

#!/usr/bin/env bash
# KubeDrill lab pack: RBAC: least-privilege deployer (s11-rbac-sa)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create Role `deploy-manager` with get,list,create,update on deployments'
chk 'Create Role `deploy-manager` with get,list,create,update on deployments' 'kubectl get role/deploy-manager -n ci >/dev/null 2>&1'
echo 'Task 2: Bind it to the ServiceAccount'
chk 'Bind it to the ServiceAccount' '[ "$(kubectl auth can-i create deployments --as=system:serviceaccount:ci:deployer -n ci 2>/dev/null)" = yes ]'
echo 'Task 3: Prove it is least-privilege'
chk 'Prove it is least-privilege' '[ "$(kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci 2>/dev/null)" = no ] && [ "$(kubectl auth can-i get secrets --as=system:serviceaccount:ci:deployer -n ci 2>/dev/null)" = no ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

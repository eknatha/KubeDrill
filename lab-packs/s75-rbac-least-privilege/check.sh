#!/usr/bin/env bash
# KubeLab lab pack: Cut a wildcard Role down to least privilege (s75-rbac-least-privilege)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Deployer can still manage Deployments'
chk 'Deployer can still manage Deployments' '[ "$(kubectl auth can-i create deployments --as=system:serviceaccount:ci:deployer -n ci 2>/dev/null)" = yes ] && [ "$(kubectl auth can-i update deployments --as=system:serviceaccount:ci:deployer -n ci 2>/dev/null)" = yes ]'
echo 'Task 2: …but cannot read Secrets'
chk '…but cannot read Secrets' '[ "$(kubectl auth can-i get secrets --as=system:serviceaccount:ci:deployer -n ci 2>/dev/null)" = no ]'
echo 'Task 3: …and cannot delete Deployments'
chk '…and cannot delete Deployments' '[ "$(kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci 2>/dev/null)" = no ] && kubectl get rolebinding/deployer -n ci >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

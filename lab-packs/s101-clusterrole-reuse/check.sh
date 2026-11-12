#!/usr/bin/env bash
# KubeDrill lab pack: RBAC: one ClusterRole, bound per namespace (s101-clusterrole-reuse)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: ClusterRole `pod-viewer` exists'
chk 'ClusterRole `pod-viewer` exists' 'kubectl get clusterrole/pod-viewer >/dev/null 2>&1'
echo 'Task 2: `ci` can list pods in dev and qa'
chk '`ci` can list pods in dev and qa' '[ "$(kubectl auth can-i list pods --as=system:serviceaccount:dev:ci -n dev 2>/dev/null)" = yes ] && [ "$(kubectl auth can-i list pods --as=system:serviceaccount:dev:ci -n qa 2>/dev/null)" = yes ]'
echo 'Task 3: `ci` cannot list pods in prod, and cannot delete anywhere'
chk '`ci` cannot list pods in prod, and cannot delete anywhere' '[ "$(kubectl auth can-i list pods --as=system:serviceaccount:dev:ci -n prod 2>/dev/null)" = no ] && [ "$(kubectl auth can-i delete pods --as=system:serviceaccount:dev:ci -n dev 2>/dev/null)" = no ] && ! kubectl get clusterrolebinding/ci-view >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

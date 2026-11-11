#!/usr/bin/env bash
# KubeLab lab pack: ClusterRole: let a ServiceAccount list nodes (s49-clusterrole-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: ClusterRole `node-reader` (get,list nodes)'
chk 'ClusterRole `node-reader` (get,list nodes)' 'kubectl get clusterrole/node-reader >/dev/null 2>&1'
echo 'Task 2: Bind it to the ServiceAccount cluster-wide'
chk 'Bind it to the ServiceAccount cluster-wide' '[ "$(kubectl auth can-i list nodes --as=system:serviceaccount:obs:monitor 2>/dev/null)" = yes ]'
echo 'Task 3: Least privilege: no delete on nodes'
chk 'Least privilege: no delete on nodes' '[ "$(kubectl auth can-i delete nodes --as=system:serviceaccount:obs:monitor 2>/dev/null)" = no ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

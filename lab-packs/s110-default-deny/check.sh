#!/usr/bin/env bash
# KubeDrill lab pack: Default-deny, then allow only what is needed (s110-default-deny)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: A default-deny policy exists (all pods)'
chk 'A default-deny policy exists (all pods)' 'kubectl get networkpolicy/default-deny -n zt >/dev/null 2>&1 && [ "$(kubectl get networkpolicy/default-deny -n zt -o jsonpath='\''{.spec.policyTypes[1]}'\'' 2>/dev/null)" = '\''Egress'\'' ]'
echo 'Task 2: `frontend` can reach `db`:80'
chk '`frontend` can reach `db`:80' 'kubectl exec -n zt frontend -- wget -qO- -T 3 db:80 >/dev/null 2>&1'
echo 'Task 3: `intruder` is still blocked'
chk '`intruder` is still blocked' '! kubectl exec -n zt intruder -- wget -qO- -T 3 db:80 >/dev/null 2>&1 && kubectl get networkpolicy/default-deny -n zt >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

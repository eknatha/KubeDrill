#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy: allow only a labelled namespace (s52-netpol-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: NetworkPolicy `db-from-prod` exists'
chk 'NetworkPolicy `db-from-prod` exists' 'kubectl get networkpolicy/db-from-prod -n data >/dev/null 2>&1'
echo 'Task 2: web-ns tester can reach db'
chk 'web-ns tester can reach db' 'kubectl exec -n web-ns tester -- wget -qO- -T 3 db.data:80 >/dev/null 2>&1'
echo 'Task 3: other tester is blocked'
chk 'other tester is blocked' '! kubectl exec -n other tester -- wget -qO- -T 3 db.data:80 >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

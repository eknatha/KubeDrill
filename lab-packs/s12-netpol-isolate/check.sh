#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy: lock down the database (s12-netpol-isolate)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Verify the problem: intruder can reach db'
chk 'Verify the problem: intruder can reach db' 'kubectl get networkpolicy/db-allow-frontend -n app >/dev/null 2>&1'
echo 'Task 2: Create NetworkPolicy `db-allow-frontend`'
chk 'Create NetworkPolicy `db-allow-frontend`' 'kubectl exec -n app frontend -- wget -qO- -T 3 db:80 >/dev/null 2>&1'
echo 'Task 3: Intruder is blocked'
chk 'Intruder is blocked' '! kubectl exec -n app intruder -- wget -qO- -T 3 db:80 >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

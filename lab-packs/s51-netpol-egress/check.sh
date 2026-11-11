#!/usr/bin/env bash
# KubeLab lab pack: NetworkPolicy egress: allow only the API (s51-netpol-egress)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Confirm client is isolated'
chk 'Confirm client is isolated' 'kubectl get networkpolicy/client-to-api -n eg >/dev/null 2>&1'
echo 'Task 2: client → api:80 allowed'
chk 'client → api:80 allowed' 'kubectl exec -n eg client -- wget -qO- -T 3 api:80 >/dev/null 2>&1'
echo 'Task 3: client → admin:80 still blocked'
chk 'client → admin:80 still blocked' '! kubectl exec -n eg client -- wget -qO- -T 3 admin:80 >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

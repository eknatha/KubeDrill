#!/usr/bin/env bash
# KubeLab lab pack: LoadBalancer stuck on <pending> (s83-lb-pending)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Understand why it is pending'
chk 'Understand why it is pending' 'kubectl get service/web -n shop >/dev/null 2>&1'
echo 'Task 2: Expose it with a NodePort Service'
chk 'Expose it with a NodePort Service' '[ "$(kubectl get service/web -n shop -o jsonpath='\''{.spec.type}'\'' 2>/dev/null)" = '\''NodePort'\'' ]'
echo 'Task 3: Endpoints still healthy'
chk 'Endpoints still healthy' '[ "$(kubectl get endpoints web -n shop -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

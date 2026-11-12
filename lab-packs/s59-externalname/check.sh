#!/usr/bin/env bash
# KubeDrill lab pack: ExternalName Service for an outside database (s59-externalname)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Remove the wrong Service'
chk 'Remove the wrong Service' '[ "$(kubectl get svc/legacy-db -n ext -o jsonpath='\''{.spec.type}'\'' 2>/dev/null)" = '\''ExternalName'\'' ]'
echo 'Task 2: ExternalName → db.example.com'
chk 'ExternalName → db.example.com' '[ "$(kubectl get svc/legacy-db -n ext -o jsonpath='\''{.spec.externalName}'\'' 2>/dev/null)" = '\''db.example.com'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

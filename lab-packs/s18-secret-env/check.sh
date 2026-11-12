#!/usr/bin/env bash
# KubeDrill lab pack: CreateContainerConfigError: missing Secret (s18-secret-env)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create Secret `db-creds` with key `password`'
chk 'Create Secret `db-creds` with key `password`' 'kubectl get secret/db-creds -n vault >/dev/null 2>&1'
echo 'Task 2: Pods become Ready'
chk 'Pods become Ready' '[ "$(kubectl get pods -n vault -l app=billing -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

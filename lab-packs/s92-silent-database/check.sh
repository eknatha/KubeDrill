#!/usr/bin/env bash
# KubeDrill lab pack: Incident: the silent database (s92-silent-database)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Storage: the claim binds'
chk 'Storage: the claim binds' '[ "$(kubectl get pvc/db-data -n data -o jsonpath='\''{.status.phase}'\'' 2>/dev/null)" = '\''Bound'\'' ]'
echo 'Task 2: Configuration: db starts'
chk 'Configuration: db starts' 'kubectl get secret/db-creds -n data >/dev/null 2>&1 && [ "$(kubectl get pods -n data -l app=db -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Task 3: Network: app may reach db, nobody else'
chk 'Network: app may reach db, nobody else' 'kubectl exec -n data app -- wget -qO- -T 3 db:80 >/dev/null 2>&1 && kubectl get networkpolicy/db-lockdown -n data >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

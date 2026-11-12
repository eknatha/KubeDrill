#!/usr/bin/env bash
# KubeDrill lab pack: Required node affinity with no matching node (s36-node-affinity)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: worker1 labelled zone-a'
chk 'worker1 labelled zone-a' '[ "$(kubectl get node/worker1 -o jsonpath='\''{.metadata.labels.topology\.kubernetes\.io/zone}'\'' 2>/dev/null)" = '\''zone-a'\'' ]'
echo 'Task 2: cache pods Ready'
chk 'cache pods Ready' '[ "$(kubectl get pods -n zone -l app=cache -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

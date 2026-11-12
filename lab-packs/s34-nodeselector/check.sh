#!/usr/bin/env bash
# KubeDrill lab pack: Pending: nodeSelector matches no node (s34-nodeselector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Label worker2 with gpu=true'
chk 'Label worker2 with gpu=true' '[ "$(kubectl get node/worker2 -o jsonpath='\''{.metadata.labels.gpu}'\'' 2>/dev/null)" = '\''true'\'' ]'
echo 'Task 2: Both pods Ready'
chk 'Both pods Ready' '[ "$(kubectl get pods -n sched -l app=ml -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

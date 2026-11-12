#!/usr/bin/env bash
# KubeDrill lab pack: DaemonSet only runs on one node (s42-daemonset-all-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: nodeSelector removed'
chk 'nodeSelector removed' '[ "$(kubectl get ds/logger -n agents -o jsonpath='\''{.spec.template.spec.nodeSelector.role}'\'' 2>/dev/null)" = '\'''\'' ]'
echo 'Task 2: A logger pod Ready on each worker (2)'
chk 'A logger pod Ready on each worker (2)' '[ "$(kubectl get pods -n agents -l app=logger -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

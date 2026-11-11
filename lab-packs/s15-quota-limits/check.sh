#!/usr/bin/env bash
# KubeLab lab pack: ResourceQuota blocks the rollout (s15-quota-limits)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find the quota error'
chk 'Find the quota error' '[ "$(kubectl get resourcequota/cpu-cap -n team-a -o jsonpath='\''{.spec.hard.requests\.cpu}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo 'Task 2: Run 4 Ready replicas within the quota'
chk 'Run 4 Ready replicas within the quota' '[ "$(kubectl get pods -n team-a -l app=crunch -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 4 ] && true'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

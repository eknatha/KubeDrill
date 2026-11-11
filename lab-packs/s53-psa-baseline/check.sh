#!/usr/bin/env bash
# KubeLab lab pack: Pod Security (baseline) rejects a privileged pod (s53-psa-baseline)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Namespace still enforces baseline'
chk 'Namespace still enforces baseline' '[ "$(kubectl get namespace/base -o jsonpath='\''{.metadata.labels.pod-security\.kubernetes\.io/enforce}'\'' 2>/dev/null)" = '\''baseline'\'' ]'
echo 'Task 2: agent runs 2 pods, not privileged'
chk 'agent runs 2 pods, not privileged' '[ "$(kubectl get pods -n base -l app=agent -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ] && [ "$(kubectl get deploy/agent -n base -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.privileged}'\'' 2>/dev/null)" = '\'''\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

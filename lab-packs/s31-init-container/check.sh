#!/usr/bin/env bash
# KubeDrill lab pack: Init:CrashLoopBackOff — failing init container (s31-init-container)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Identify the failing init container'
chk 'Identify the failing init container' '[ -n "$(kubectl get deploy/app -n boot -o jsonpath='\''{.spec.template.spec.initContainers[0].command[2]}'\'' 2>/dev/null)" ] && [ "$(kubectl get deploy/app -n boot -o jsonpath='\''{.spec.template.spec.initContainers[0].command[2]}'\'' 2>/dev/null)" != '\''echo preparing; exit 1'\'' ]'
echo 'Task 2: Pod Ready'
chk 'Pod Ready' '[ "$(kubectl get pods -n boot -l app=app -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

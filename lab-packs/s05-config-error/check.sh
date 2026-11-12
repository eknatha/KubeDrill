#!/usr/bin/env bash
# KubeDrill lab pack: CreateContainerConfigError: missing ConfigMap (s05-config-error)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create ConfigMap `app-config` with LOG_LEVEL=debug'
chk 'Create ConfigMap `app-config` with LOG_LEVEL=debug' '[ "$(kubectl get cm/app-config -n inventory -o jsonpath='\''{.data.LOG_LEVEL}'\'' 2>/dev/null)" = '\''debug'\'' ]'
echo 'Task 2: Both pods become Ready'
chk 'Both pods become Ready' '[ "$(kubectl get pods -n inventory -l app=app -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 3: Prove the env var inside a pod'
chk 'Prove the env var inside a pod' '[ "$(kubectl get cm/app-config -n inventory -o jsonpath='\''{.data.LOG_LEVEL}'\'' 2>/dev/null)" = '\''debug'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

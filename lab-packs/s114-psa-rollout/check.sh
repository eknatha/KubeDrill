#!/usr/bin/env bash
# KubeLab lab pack: Pod Security: warn and audit before you enforce (s114-psa-rollout)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Namespace enforces `baseline`'
chk 'Namespace enforces `baseline`' '[ "$(kubectl get namespace/rollout-ns -o jsonpath='\''{.metadata.labels.pod-security\.kubernetes\.io/enforce}'\'' 2>/dev/null)" = '\''baseline'\'' ]'
echo 'Task 2: `warn` and `audit` are `restricted`'
chk '`warn` and `audit` are `restricted`' '[ "$(kubectl get namespace/rollout-ns -o jsonpath='\''{.metadata.labels.pod-security\.kubernetes\.io/warn}'\'' 2>/dev/null)" = '\''restricted'\'' ] && [ "$(kubectl get namespace/rollout-ns -o jsonpath='\''{.metadata.labels.pod-security\.kubernetes\.io/audit}'\'' 2>/dev/null)" = '\''restricted'\'' ]'
echo 'Task 3: Existing pods keep running'
chk 'Existing pods keep running' '[ "$(kubectl get pods -n rollout-ns -l app=app -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

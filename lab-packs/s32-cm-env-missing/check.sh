#!/usr/bin/env bash
# KubeLab lab pack: Missing ConfigMap key breaks the pod (s32-cm-env-missing)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create ConfigMap `site-config` with theme=dark'
chk 'Create ConfigMap `site-config` with theme=dark' '[ "$(kubectl get cm/site-config -n cfg -o jsonpath='\''{.data.theme}'\'' 2>/dev/null)" = '\''dark'\'' ]'
echo 'Task 2: Pods Ready'
chk 'Pods Ready' '[ "$(kubectl get pods -n cfg -l app=site -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

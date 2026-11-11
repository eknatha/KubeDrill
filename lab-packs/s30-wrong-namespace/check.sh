#!/usr/bin/env bash
# KubeLab lab pack: Deployed into the wrong namespace (s30-wrong-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: portal runs in staging with 3 ready pods'
chk 'portal runs in staging with 3 ready pods' '[ "$(kubectl get pods -n staging -l app=portal -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo 'Task 2: portal removed from default'
chk 'portal removed from default' '! kubectl get deploy/portal -n default >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

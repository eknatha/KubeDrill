#!/usr/bin/env bash
# KubeDrill lab pack: hostPath volume blocked by Pod Security (s54-hostpath-baseline)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Understand why pods fail'
chk 'Understand why pods fail' '[ "$(kubectl get deploy/logger -n hp -o jsonpath='\''{.spec.template.spec.volumes[0].hostPath.path}'\'' 2>/dev/null)" = '\'''\'' ]'
echo 'Task 2: logger Ready with emptyDir'
chk 'logger Ready with emptyDir' '[ "$(kubectl get pods -n hp -l app=logger -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

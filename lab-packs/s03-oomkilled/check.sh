#!/usr/bin/env bash
# KubeDrill lab pack: CrashLoopBackOff: OOMKilled (s03-oomkilled)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Confirm the pods were OOMKilled'
chk 'Confirm the pods were OOMKilled' '[ -n "$(kubectl get deploy/worker -n batch -o jsonpath='\''{.spec.template.spec.containers[0].resources.limits.memory}'\'' 2>/dev/null)" ] && [ "$(kubectl get deploy/worker -n batch -o jsonpath='\''{.spec.template.spec.containers[0].resources.limits.memory}'\'' 2>/dev/null)" != '\''100Mi'\'' ]'
echo 'Task 2: Raise the memory limit to at least 256Mi'
chk 'Raise the memory limit to at least 256Mi' '[ "$(kubectl get pods -n batch -l app=worker -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

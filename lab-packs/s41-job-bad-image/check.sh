#!/usr/bin/env bash
# KubeDrill lab pack: Job stuck: ImagePullBackOff (s41-job-bad-image)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find the bad image'
chk 'Find the bad image' '[ -n "$(kubectl get job/migrate -n jobs -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" ] && [ "$(kubectl get job/migrate -n jobs -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" != '\''busybox:doesnotexist'\'' ]'
echo 'Task 2: Job completes (succeeded: 1)'
chk 'Job completes (succeeded: 1)' '[ "$(kubectl get job/migrate -n jobs -o jsonpath='\''{.status.succeeded}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

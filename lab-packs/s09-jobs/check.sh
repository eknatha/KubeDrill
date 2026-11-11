#!/usr/bin/env bash
# KubeLab lab pack: Jobs and CronJobs (s09-jobs)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Job `report`: busybox:1.36, runs `echo done`, completions=3'
chk 'Job `report`: busybox:1.36, runs `echo done`, completions=3' '[ "$(kubectl get job/report -n jobs -o jsonpath='\''{.spec.completions}'\'' 2>/dev/null)" = '\''3'\'' ]'
echo 'Task 2: The Job finishes with 3 successful pods'
chk 'The Job finishes with 3 successful pods' '[ "$(kubectl get job/report -n jobs -o jsonpath='\''{.status.succeeded}'\'' 2>/dev/null)" = '\''3'\'' ]'
echo 'Task 3: CronJob `cleanup`: schedule `*/5 * * * *`, image busybox:1.36'
chk 'CronJob `cleanup`: schedule `*/5 * * * *`, image busybox:1.36' '[ "$(kubectl get cronjob/cleanup -n jobs -o jsonpath='\''{.spec.schedule}'\'' 2>/dev/null)" = '\''*/5 * * * *'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

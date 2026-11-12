#!/usr/bin/env bash
# KubeDrill lab pack: CronJob: no overlap, tidy history (s104-cronjob-policy)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Schedule is every 10 minutes'
chk 'Schedule is every 10 minutes' '[ "$(kubectl get cronjob/cleanup -n cron -o jsonpath='\''{.spec.schedule}'\'' 2>/dev/null)" = '\''*/10 * * * *'\'' ]'
echo 'Task 2: Overlaps are forbidden'
chk 'Overlaps are forbidden' '[ "$(kubectl get cronjob/cleanup -n cron -o jsonpath='\''{.spec.concurrencyPolicy}'\'' 2>/dev/null)" = '\''Forbid'\'' ]'
echo 'Task 3: History 1 success / 2 failed, 60s start deadline'
chk 'History 1 success / 2 failed, 60s start deadline' '[ "$(kubectl get cronjob/cleanup -n cron -o jsonpath='\''{.spec.successfulJobsHistoryLimit}'\'' 2>/dev/null)" = '\''1'\'' ] && [ "$(kubectl get cronjob/cleanup -n cron -o jsonpath='\''{.spec.failedJobsHistoryLimit}'\'' 2>/dev/null)" = '\''2'\'' ] && [ "$(kubectl get cronjob/cleanup -n cron -o jsonpath='\''{.spec.startingDeadlineSeconds}'\'' 2>/dev/null)" = '\''60'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

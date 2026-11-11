#!/usr/bin/env bash
# KubeLab lab pack: CronJob never runs: suspended + wrong schedule (s40-cronjob-fix)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Schedule is every 15 minutes'
chk 'Schedule is every 15 minutes' '[ "$(kubectl get cronjob/backup -n cron -o jsonpath='\''{.spec.schedule}'\'' 2>/dev/null)" = '\''*/15 * * * *'\'' ]'
echo 'Task 2: Not suspended'
chk 'Not suspended' '[ "$(kubectl get cronjob/backup -n cron -o jsonpath='\''{.spec.suspend}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

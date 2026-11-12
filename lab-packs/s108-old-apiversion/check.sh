#!/usr/bin/env bash
# KubeDrill lab pack: Fix a manifest that uses a removed API version (s108-old-apiversion)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Manifest uses the current apiVersion'
chk 'Manifest uses the current apiVersion' '[ -f "$HOME/old-cron.yaml" ] && grep -q -- '\''apiVersion: batch/v1
'\'' '\''old-cron.yaml'\'''
echo 'Task 2: CronJob `nightly` applied'
chk 'CronJob `nightly` applied' 'kubectl get cronjob/nightly -n legacy2 >/dev/null 2>&1 && [ "$(kubectl get cronjob/nightly -n legacy2 -o jsonpath='\''{.spec.schedule}'\'' 2>/dev/null)" = '\''0 2 * * *'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

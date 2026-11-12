#!/usr/bin/env bash
# KubeDrill lab pack: Read the audit log: who touched the secret? (s112-audit-hunt)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: answer.txt names the user who read `prod-db` successfully'
chk 'answer.txt names the user who read `prod-db` successfully' '[ -f "$HOME/answer.txt" ] && grep -q -- '\''user=mallory'\'' '\''answer.txt'\'''
echo 'Task 2: denied.txt holds the number of 403 events'
chk 'denied.txt holds the number of 403 events' '[ -f "$HOME/denied.txt" ] && grep -q -- '\''3'\'' '\''denied.txt'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

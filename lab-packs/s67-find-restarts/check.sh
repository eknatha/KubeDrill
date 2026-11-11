#!/usr/bin/env bash
# KubeLab lab pack: Find the pod that keeps restarting (s67-find-restarts)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: answer.txt names the crashing pod'
chk 'answer.txt names the crashing pod' '[ -f "$HOME/answer.txt" ] && grep -q -- '\''flaky'\'' '\''answer.txt'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

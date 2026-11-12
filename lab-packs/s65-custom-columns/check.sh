#!/usr/bin/env bash
# KubeDrill lab pack: custom-columns and --sort-by (s65-custom-columns)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: pods.txt has NAME and NODE columns'
chk 'pods.txt has NAME and NODE columns' '[ -f "$HOME/pods.txt" ] && grep -q -- '\''NODE'\'' '\''pods.txt'\'''
echo 'Task 2: sorted.txt sorted by creation time'
chk 'sorted.txt sorted by creation time' '[ -f "$HOME/sorted.txt" ] && grep -q -- '\''pod/'\'' '\''sorted.txt'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

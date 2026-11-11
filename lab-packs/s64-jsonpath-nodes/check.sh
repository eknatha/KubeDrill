#!/usr/bin/env bash
# KubeLab lab pack: JSONPath: extract node names and images (s64-jsonpath-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: nodes.txt contains the node names'
chk 'nodes.txt contains the node names' '[ -f "$HOME/nodes.txt" ] && grep -q -- '\''worker1'\'' '\''nodes.txt'\'''
echo 'Task 2: images.txt contains the pod images'
chk 'images.txt contains the pod images' '[ -f "$HOME/images.txt" ] && grep -q -- '\''nginx:1.25'\'' '\''images.txt'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

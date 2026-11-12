#!/usr/bin/env bash
# KubeDrill lab pack: Back up etcd with a snapshot (s63-etcd-backup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Snapshot saved'
chk 'Snapshot saved' '[ -f "$HOME/etcd-backup.db" ]'
echo 'Task 2: Snapshot verified'
chk 'Snapshot verified' '[ -f "$HOME/etcd-backup.db" ] && grep -q -- '\''etcd'\'' '\''etcd-backup.db'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

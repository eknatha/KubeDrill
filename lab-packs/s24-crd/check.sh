#!/usr/bin/env bash
# KubeDrill lab pack: Extend Kubernetes: CRD + custom resource (s24-crd)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create CRD `backups.stable.example.com`'
chk 'Create CRD `backups.stable.example.com`' 'kubectl get crd/backups.stable.example.com >/dev/null 2>&1'
echo 'Task 2: Create Backup `nightly`'
chk 'Create Backup `nightly`' '[ "$(kubectl get backup/nightly -n ops -o jsonpath='\''{.spec.schedule}'\'' 2>/dev/null)" = '\''0 2 * * *'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

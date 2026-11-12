#!/usr/bin/env bash
# KubeDrill lab pack: Storage: keep the data, allow expansion (s97-pv-retain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: PV `pv-reports` keeps data after the claim is deleted'
chk 'PV `pv-reports` keeps data after the claim is deleted' '[ "$(kubectl get pv/pv-reports -o jsonpath='\''{.spec.persistentVolumeReclaimPolicy}'\'' 2>/dev/null)" = '\''Retain'\'' ]'
echo 'Task 2: StorageClass `fast` allows volume expansion'
chk 'StorageClass `fast` allows volume expansion' '[ "$(kubectl get sc/fast -o jsonpath='\''{.allowVolumeExpansion}'\'' 2>/dev/null)" = '\''true'\'' ]'
echo 'Task 3: Claim `reports` requests 2Gi'
chk 'Claim `reports` requests 2Gi' '[ "$(kubectl get pvc/reports -n store -o jsonpath='\''{.spec.resources.requests.storage}'\'' 2>/dev/null)" = '\''2Gi'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

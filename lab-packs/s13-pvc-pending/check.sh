#!/usr/bin/env bash
# KubeDrill lab pack: PVC stuck Pending (s13-pvc-pending)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find the cause'
chk 'Find the cause' '[ -n "$(kubectl get pvc/store-data -n data -o jsonpath='\''{.spec.storageClassName}'\'' 2>/dev/null)" ] && [ "$(kubectl get pvc/store-data -n data -o jsonpath='\''{.spec.storageClassName}'\'' 2>/dev/null)" != '\''fast'\'' ]'
echo 'Task 2: PVC Bound and pod Running'
chk 'PVC Bound and pod Running' '[ "$(kubectl get pvc/store-data -n data -o jsonpath='\''{.status.phase}'\'' 2>/dev/null)" = '\''Bound'\'' ] && [ "$(kubectl get pods -n data -l app=store -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

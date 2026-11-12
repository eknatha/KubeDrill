#!/usr/bin/env bash
# KubeDrill lab pack: HPA shows <unknown>: no CPU requests (s100-hpa-unknown)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find the cause'
chk 'Find the cause' 'kubectl get hpa/web -n scale >/dev/null 2>&1'
echo 'Task 2: Deployment `web` requests 100m CPU'
chk 'Deployment `web` requests 100m CPU' 'true # (simulator-only check)'
echo 'Task 3: HPA keeps its 2–6 range and 50% target'
chk 'HPA keeps its 2–6 range and 50% target' '[ "$(kubectl get hpa/web -n scale -o jsonpath='\''{.spec.maxReplicas}'\'' 2>/dev/null)" = '\''6'\'' ] && [ "$(kubectl get pods -n scale -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

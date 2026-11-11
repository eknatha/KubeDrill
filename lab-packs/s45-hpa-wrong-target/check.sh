#!/usr/bin/env bash
# KubeLab lab pack: HPA points at the wrong Deployment (s45-hpa-wrong-target)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: HPA targets `checkout`'
chk 'HPA targets `checkout`' '[ "$(kubectl get hpa/checkout -n scale -o jsonpath='\''{.spec.scaleTargetRef.name}'\'' 2>/dev/null)" = '\''checkout'\'' ]'
echo 'Task 2: Deployment has ≥2 Ready pods'
chk 'Deployment has ≥2 Ready pods' '[ "$(kubectl get pods -n scale -l app=checkout -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

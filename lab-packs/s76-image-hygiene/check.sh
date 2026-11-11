#!/usr/bin/env bash
# KubeLab lab pack: Pin and vet container images (s76-image-hygiene)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: No :latest or untagged images'
chk 'No :latest or untagged images' '[ "$(kubectl get deployment/web -n prod -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.25.5'\'' ] && [ "$(kubectl get deployment/api -n prod -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.25.5'\'' ]'
echo 'Task 2: Nothing from the untrusted registry'
chk 'Nothing from the untrusted registry' '[ "$(kubectl get deployment/worker -n prod -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.25.5'\'' ]'
echo 'Task 3: All pods healthy'
chk 'All pods healthy' '[ "$(kubectl get pods -n prod -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

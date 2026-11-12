#!/usr/bin/env bash
# KubeDrill lab pack: Scan images and replace the vulnerable ones (s27-image-scan)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Scan the images'
chk 'Scan the images' '[ -n "$(kubectl get deploy/web -n scan -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" ] && [ "$(kubectl get deploy/web -n scan -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" != '\''nginx:1.19'\'' ]'
echo 'Task 2: Both Deployments on the alpine images, Ready'
chk 'Both Deployments on the alpine images, Ready' 'echo "$(kubectl get deploy/cache -n scan -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" | grep -q -- '\''alpine'\'' && [ "$(kubectl get pods -n scan -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

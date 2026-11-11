#!/usr/bin/env bash
# KubeLab lab pack: Kustomize: base + prod overlay (s25-kustomize)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Create overlays/prod/kustomization.yaml'
chk 'Create overlays/prod/kustomization.yaml' '[ -f "$HOME/overlays/prod/kustomization.yaml" ] && grep -q -- '\''namePrefix'\'' '\''overlays/prod/kustomization.yaml'\'''
echo 'Task 2: Apply the overlay: prod-web with 3 Ready replicas'
chk 'Apply the overlay: prod-web with 3 Ready replicas' '[ "$(kubectl get deploy/prod-web -n shop -o jsonpath='\''{.spec.replicas}'\'' 2>/dev/null)" = '\''3'\'' ] && [ "$(kubectl get pods -n shop -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

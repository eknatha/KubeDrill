#!/usr/bin/env bash
# KubeLab lab pack: Kustomize: override the image tag (s62-kustomize-images)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: overlays/prod/kustomization.yaml uses `images`'
chk 'overlays/prod/kustomization.yaml uses `images`' '[ -f "$HOME/overlays/prod/kustomization.yaml" ] && grep -q -- '\''newTag'\'' '\''overlays/prod/kustomization.yaml'\'''
echo 'Task 2: Deployed: web runs nginx:1.25'
chk 'Deployed: web runs nginx:1.25' '[ "$(kubectl get deploy/web -n img -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" = '\''nginx:1.25'\'' ] && [ "$(kubectl get pods -n img -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

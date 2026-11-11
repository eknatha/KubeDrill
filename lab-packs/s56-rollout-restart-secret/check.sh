#!/usr/bin/env bash
# KubeLab lab pack: Rotate a Secret and restart the workload (s56-rollout-restart-secret)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Secret password is `rotated`'
chk 'Secret password is `rotated`' '[ "$(kubectl get secret/db-creds -n rot -o jsonpath='\''{.data.password}'\'' 2>/dev/null)" = '\''cm90YXRlZA=='\'' ]'
echo 'Task 2: Deployment restarted; 2 pods Ready'
chk 'Deployment restarted; 2 pods Ready' '[ -n "$(kubectl get deploy/app -n rot -o jsonpath='\''{.spec.template.metadata.annotations.kubectl\.kubernetes\.io/restartedAt}'\'' 2>/dev/null)" ] && [ "$(kubectl get pods -n rot -l app=app -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

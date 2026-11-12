#!/usr/bin/env bash
# KubeDrill lab pack: Incident: the release that never finishes (s93-release-gone-wrong)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find why v2 pods are not Ready'
chk 'Find why v2 pods are not Ready' 'kubectl get deployment/portal -n rel >/dev/null 2>&1'
echo 'Task 2: Config: add the missing key'
chk 'Config: add the missing key' '[ -n "$(kubectl get configmap/portal-config -n rel -o jsonpath='\''{.data.FEATURE_FLAGS}'\'' 2>/dev/null)" ] && [ "$(kubectl get configmap/portal-config -n rel -o jsonpath='\''{.data.FEATURE_FLAGS}'\'' 2>/dev/null)" != '\'''\'' ]'
echo 'Task 3: Probe: use a path that exists'
chk 'Probe: use a path that exists' '[ "$(kubectl get deployment/portal -n rel -o jsonpath='\''{.spec.template.spec.containers[0].readinessProbe.httpGet.path}'\'' 2>/dev/null)" = '\''/'\'' ]'
echo 'Task 4: Rollout completes: 3 Ready'
chk 'Rollout completes: 3 Ready' '[ "$(kubectl get pods -n rel -l app=portal -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

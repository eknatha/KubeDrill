#!/usr/bin/env bash
# KubeLab lab pack: Onboard a tenant namespace (s26-multitenant)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Namespace `team-b` with ResourceQuota `team-quota` (pods: 5)'
chk 'Namespace `team-b` with ResourceQuota `team-quota` (pods: 5)' '[ "$(kubectl get resourcequota/team-quota -n team-b -o jsonpath='\''{.spec.hard.pods}'\'' 2>/dev/null)" = '\''5'\'' ]'
echo 'Task 2: LimitRange `defaults` with default cpu limit 200m'
chk 'LimitRange `defaults` with default cpu limit 200m' '[ "$(kubectl get limitrange/defaults -n team-b -o jsonpath='\''{.spec.limits[0].default.cpu}'\'' 2>/dev/null)" = '\''200m'\'' ]'
echo 'Task 3: NetworkPolicy `default-deny` (ingress) selecting all pods'
chk 'NetworkPolicy `default-deny` (ingress) selecting all pods' 'kubectl get networkpolicy/default-deny -n team-b >/dev/null 2>&1'
echo 'Task 4: Run pod `probe` and see the default limit applied'
chk 'Run pod `probe` and see the default limit applied' '[ "$(kubectl get pod/probe -n team-b -o jsonpath='\''{.spec.containers[0].resources.limits.cpu}'\'' 2>/dev/null)" = '\''200m'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

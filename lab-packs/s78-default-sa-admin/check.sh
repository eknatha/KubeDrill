#!/usr/bin/env bash
# KubeLab lab pack: The default ServiceAccount is cluster-admin (s78-default-sa-admin)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Default SA is no longer privileged'
chk 'Default SA is no longer privileged' '[ "$(kubectl auth can-i list secrets --as=system:serviceaccount:apps:default -n apps 2>/dev/null)" = no ]'
echo 'Task 2: Dedicated SA `dash-reader` can read pods in apps'
chk 'Dedicated SA `dash-reader` can read pods in apps' '[ "$(kubectl auth can-i list pods --as=system:serviceaccount:apps:dash-reader -n apps 2>/dev/null)" = yes ] && [ "$(kubectl auth can-i delete pods --as=system:serviceaccount:apps:dash-reader -n apps 2>/dev/null)" = no ]'
echo 'Task 3: Dashboard uses its own SA'
chk 'Dashboard uses its own SA' '[ "$(kubectl get deployment/dash -n apps -o jsonpath='\''{.spec.template.spec.serviceAccountName}'\'' 2>/dev/null)" = '\''dash-reader'\'' ] && [ "$(kubectl get pods -n apps -l app=dash -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

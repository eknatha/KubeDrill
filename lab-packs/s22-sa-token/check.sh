#!/usr/bin/env bash
# KubeDrill lab pack: Harden ServiceAccount token mounting (s22-sa-token)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: ServiceAccount `web-sa` with automountServiceAccountToken: false'
chk 'ServiceAccount `web-sa` with automountServiceAccountToken: false' '[ "$(kubectl get sa/web-sa -n hardening -o jsonpath='\''{.automountServiceAccountToken}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo 'Task 2: Deployment uses web-sa and automount false'
chk 'Deployment uses web-sa and automount false' '[ "$(kubectl get deploy/web -n hardening -o jsonpath='\''{.spec.template.spec.serviceAccountName}'\'' 2>/dev/null)" = '\''web-sa'\'' ] && [ "$(kubectl get deploy/web -n hardening -o jsonpath='\''{.spec.template.spec.automountServiceAccountToken}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo 'Task 3: Pods Ready after the change'
chk 'Pods Ready after the change' '[ "$(kubectl get pods -n hardening -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

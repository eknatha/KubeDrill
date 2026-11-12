#!/usr/bin/env bash
# KubeDrill lab pack: Stop leaking secrets through env vars (s111-secret-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Secret mounted as a volume with defaultMode 0400'
chk 'Secret mounted as a volume with defaultMode 0400' '[ "$(kubectl get deploy/billing -n vault -o jsonpath='\''{.spec.template.spec.volumes[0].secret.secretName}'\'' 2>/dev/null)" = '\''db-pass'\'' ] && [ "$(kubectl get deploy/billing -n vault -o jsonpath='\''{.spec.template.spec.volumes[0].secret.defaultMode}'\'' 2>/dev/null)" = '\''256'\'' ]'
echo 'Task 2: Mounted read-only at /etc/db'
chk 'Mounted read-only at /etc/db' '[ "$(kubectl get deploy/billing -n vault -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].mountPath}'\'' 2>/dev/null)" = '\''/etc/db'\'' ] && [ "$(kubectl get deploy/billing -n vault -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].readOnly}'\'' 2>/dev/null)" = '\''true'\'' ]'
echo 'Task 3: No DB_PASSWORD env var, pods Ready'
chk 'No DB_PASSWORD env var, pods Ready' '[ "$(kubectl get deploy/billing -n vault -o jsonpath='\''{.spec.template.spec.containers[0].env}'\'' 2>/dev/null)" = '\'''\'' ] && [ "$(kubectl get pods -n vault -l app=billing -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

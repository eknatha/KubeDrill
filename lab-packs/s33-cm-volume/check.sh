#!/usr/bin/env bash
# KubeLab lab pack: Mount a ConfigMap as a file (s33-cm-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: ConfigMap `app-props` with key app.properties'
chk 'ConfigMap `app-props` with key app.properties' 'kubectl get cm/app-props -n files >/dev/null 2>&1'
echo 'Task 2: Pod `web` mounts it at /etc/app'
chk 'Pod `web` mounts it at /etc/app' '[ "$(kubectl get pod/web -n files -o jsonpath='\''{.spec.containers[0].volumeMounts[0].mountPath}'\'' 2>/dev/null)" = '\''/etc/app'\'' ] && [ "$(kubectl get pods -n files -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

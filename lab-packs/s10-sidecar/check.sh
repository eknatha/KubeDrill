#!/usr/bin/env bash
# KubeDrill lab pack: Multi-container pod: log sidecar (s10-sidecar)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Pod `webapp` has containers `webapp` and `log-agent`'
chk 'Pod `webapp` has containers `webapp` and `log-agent`' 'echo "$(kubectl get pod/webapp -n logs -o jsonpath='\''{.spec.containers[*].name}'\'' 2>/dev/null)" | grep -q -- '\''log-agent'\'''
echo 'Task 2: Shared emptyDir volume `logs` mounted in both containers'
chk 'Shared emptyDir volume `logs` mounted in both containers' '[ "$(kubectl get pod/webapp -n logs -o jsonpath='\''{.spec.volumes[0].name}'\'' 2>/dev/null)" = '\''logs'\'' ] && [ "$(kubectl get pod/webapp -n logs -o jsonpath='\''{.spec.containers[1].volumeMounts[0].mountPath}'\'' 2>/dev/null)" = '\''/var/log/nginx'\'' ]'
echo 'Task 3: Pod Ready (2/2)'
chk 'Pod Ready (2/2)' '[ "$(kubectl get pods -n logs -l app=webapp -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

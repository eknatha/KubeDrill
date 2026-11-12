#!/usr/bin/env bash
# KubeDrill lab pack: System hardening: seccomp RuntimeDefault (s109-seccomp-default)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Pod seccomp profile is RuntimeDefault'
chk 'Pod seccomp profile is RuntimeDefault' '[ "$(kubectl get deploy/api -n sys -o jsonpath='\''{.spec.template.spec.securityContext.seccompProfile.type}'\'' 2>/dev/null)" = '\''RuntimeDefault'\'' ]'
echo 'Task 2: No privilege escalation, all capabilities dropped'
chk 'No privilege escalation, all capabilities dropped' '[ "$(kubectl get deploy/api -n sys -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation}'\'' 2>/dev/null)" = '\''false'\'' ] && [ "$(kubectl get deploy/api -n sys -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.capabilities.drop[0]}'\'' 2>/dev/null)" = '\''ALL'\'' ]'
echo 'Task 3: Read-only root filesystem, pods Ready'
chk 'Read-only root filesystem, pods Ready' '[ "$(kubectl get deploy/api -n sys -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem}'\'' 2>/dev/null)" = '\''true'\'' ] && [ "$(kubectl get pods -n sys -l app=api -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

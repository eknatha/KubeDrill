#!/usr/bin/env bash
# KubeDrill lab pack: Harden a pod's securityContext (s77-hardened-pod)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Run as non-root'
chk 'Run as non-root' '[ "$(kubectl get deployment/web -n secure -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.runAsNonRoot}'\'' 2>/dev/null)" = '\''true'\'' ]'
echo 'Task 2: Read-only root filesystem, no escalation'
chk 'Read-only root filesystem, no escalation' '[ "$(kubectl get deployment/web -n secure -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem}'\'' 2>/dev/null)" = '\''true'\'' ] && [ "$(kubectl get deployment/web -n secure -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo 'Task 3: Drop all capabilities + RuntimeDefault seccomp'
chk 'Drop all capabilities + RuntimeDefault seccomp' '[ "$(kubectl get deployment/web -n secure -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.capabilities.drop[0]}'\'' 2>/dev/null)" = '\''ALL'\'' ] && [ "$(kubectl get deployment/web -n secure -o jsonpath='\''{.spec.template.spec.securityContext.seccompProfile.type}'\'' 2>/dev/null)" = '\''RuntimeDefault'\'' ]'
echo 'Task 4: Pod still Ready'
chk 'Pod still Ready' '[ "$(kubectl get pods -n secure -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

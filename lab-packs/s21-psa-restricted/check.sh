#!/usr/bin/env bash
# KubeLab lab pack: Pod Security Admission: restricted namespace (s21-psa-restricted)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Read the admission error'
chk 'Read the admission error' '[ "$(kubectl get namespace/secure -o jsonpath='\''{.metadata.labels.pod-security\.kubernetes\.io/enforce}'\'' 2>/dev/null)" = '\''restricted'\'' ]'
echo 'Task 2: Make the Deployment compliant: 2 Ready pods'
chk 'Make the Deployment compliant: 2 Ready pods' '[ "$(kubectl get pods -n secure -l app=app -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ] && [ "$(kubectl get deploy/app -n secure -o jsonpath='\''{.spec.template.spec.containers[0].securityContext.allowPrivilegeEscalation}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

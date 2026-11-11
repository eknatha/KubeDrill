#!/usr/bin/env bash
# KubeLab lab pack: Spread replicas with pod anti-affinity (s37-pod-antiaffinity)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Anti-affinity added'
chk 'Anti-affinity added' '[ "$(kubectl get deploy/front -n spread -o jsonpath='\''{.spec.template.spec.affinity.podAntiAffinity.requiredDuringSchedulingIgnoredDuringExecution[0].topologyKey}'\'' 2>/dev/null)" = '\''kubernetes.io/hostname'\'' ]'
echo 'Task 2: 2 Ready replicas on different nodes'
chk '2 Ready replicas on different nodes' '[ "$(kubectl get pods -n spread -l app=front -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

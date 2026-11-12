#!/usr/bin/env bash
# KubeDrill lab pack: Expose a Service on a fixed NodePort (s58-nodeport-fixed)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Service type NodePort'
chk 'Service type NodePort' '[ "$(kubectl get svc/site -n np -o jsonpath='\''{.spec.type}'\'' 2>/dev/null)" = '\''NodePort'\'' ]'
echo 'Task 2: nodePort is exactly 30080'
chk 'nodePort is exactly 30080' '[ "$(kubectl get svc/site -n np -o jsonpath='\''{.spec.ports[0].nodePort}'\'' 2>/dev/null)" = '\''30080'\'' ] && [ "$(kubectl get endpoints site -n np -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

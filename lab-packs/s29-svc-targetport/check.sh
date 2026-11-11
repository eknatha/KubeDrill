#!/usr/bin/env bash
# KubeLab lab pack: Service reachable but requests fail: wrong targetPort (s29-svc-targetport)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find the wrong port'
chk 'Find the wrong port' '[ -n "$(kubectl get svc/api -n route -o jsonpath='\''{.spec.ports[0].targetPort}'\'' 2>/dev/null)" ] && [ "$(kubectl get svc/api -n route -o jsonpath='\''{.spec.ports[0].targetPort}'\'' 2>/dev/null)" != '\''8080'\'' ]'
echo 'Task 2: tester → api:80 works'
chk 'tester → api:80 works' 'kubectl exec -n route tester -- wget -qO- -T 3 api:80 >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

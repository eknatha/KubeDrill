#!/usr/bin/env bash
# KubeLab lab pack: Hardening: an over-broad binding and the default ServiceAccount (s113-open-binding)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: `everyone-admin` is gone'
chk '`everyone-admin` is gone' '! kubectl get clusterrolebinding/everyone-admin >/dev/null 2>&1'
echo 'Task 2: Default ServiceAccount no longer auto-mounts a token'
chk 'Default ServiceAccount no longer auto-mounts a token' '[ "$(kubectl get sa/default -n team -o jsonpath='\''{.automountServiceAccountToken}'\'' 2>/dev/null)" = '\''false'\'' ]'
echo 'Task 3: The default ServiceAccount still exists'
chk 'The default ServiceAccount still exists' 'kubectl get sa/default -n team >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

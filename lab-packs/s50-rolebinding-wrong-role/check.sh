#!/usr/bin/env bash
# KubeLab lab pack: RoleBinding points at the wrong Role (s50-rolebinding-wrong-role)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find what the binding references'
chk 'Find what the binding references' '[ -n "$(kubectl get rolebinding/dev-bind -n team -o jsonpath='\''{.roleRef.name}'\'' 2>/dev/null)" ] && [ "$(kubectl get rolebinding/dev-bind -n team -o jsonpath='\''{.roleRef.name}'\'' 2>/dev/null)" != '\''viewer'\'' ]'
echo 'Task 2: dev can create deployments, not read secrets'
chk 'dev can create deployments, not read secrets' '[ "$(kubectl auth can-i create deployments --as=system:serviceaccount:team:dev -n team 2>/dev/null)" = yes ] && [ "$(kubectl auth can-i get secrets --as=system:serviceaccount:team:dev -n team 2>/dev/null)" = no ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

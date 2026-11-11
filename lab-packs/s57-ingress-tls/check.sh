#!/usr/bin/env bash
# KubeLab lab pack: Ingress with TLS termination (s57-ingress-tls)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: TLS Secret `web-tls` exists'
chk 'TLS Secret `web-tls` exists' '[ "$(kubectl get secret/web-tls -n sec -o jsonpath='\''{.type}'\'' 2>/dev/null)" = '\''kubernetes.io/tls'\'' ]'
echo 'Task 2: Ingress references the secret for secure.local'
chk 'Ingress references the secret for secure.local' '[ "$(kubectl get ingress/web -n sec -o jsonpath='\''{.spec.tls[0].secretName}'\'' 2>/dev/null)" = '\''web-tls'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

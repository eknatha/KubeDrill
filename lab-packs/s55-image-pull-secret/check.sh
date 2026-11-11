#!/usr/bin/env bash
# KubeLab lab pack: ImagePullBackOff from a private registry (s55-image-pull-secret)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Secret `regcred` (docker-registry) exists'
chk 'Secret `regcred` (docker-registry) exists' '[ "$(kubectl get secret/regcred -n priv -o jsonpath='\''{.type}'\'' 2>/dev/null)" = '\''kubernetes.io/dockerconfigjson'\'' ]'
echo 'Task 2: Deployment uses it and pods are Ready'
chk 'Deployment uses it and pods are Ready' '[ "$(kubectl get deploy/billing -n priv -o jsonpath='\''{.spec.template.spec.imagePullSecrets[0].name}'\'' 2>/dev/null)" = '\''regcred'\'' ] && [ "$(kubectl get pods -n priv -l app=billing -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

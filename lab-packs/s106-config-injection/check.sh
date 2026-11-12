#!/usr/bin/env bash
# KubeDrill lab pack: Inject config: envFrom and a read-only Secret volume (s106-config-injection)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: All ConfigMap keys become env vars (envFrom)'
chk 'All ConfigMap keys become env vars (envFrom)' '[ "$(kubectl get deploy/web -n cfg -o jsonpath='\''{.spec.template.spec.containers[0].envFrom[0].configMapRef.name}'\'' 2>/dev/null)" = '\''app-config'\'' ]'
echo 'Task 2: Secret mounted read-only at /etc/creds'
chk 'Secret mounted read-only at /etc/creds' '[ "$(kubectl get deploy/web -n cfg -o jsonpath='\''{.spec.template.spec.volumes[0].secret.secretName}'\'' 2>/dev/null)" = '\''app-creds'\'' ] && [ "$(kubectl get deploy/web -n cfg -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].readOnly}'\'' 2>/dev/null)" = '\''true'\'' ] && [ "$(kubectl get deploy/web -n cfg -o jsonpath='\''{.spec.template.spec.containers[0].volumeMounts[0].mountPath}'\'' 2>/dev/null)" = '\''/etc/creds'\'' ]'
echo 'Task 3: Pods Ready, secret not in env'
chk 'Pods Ready, secret not in env' '[ "$(kubectl get pods -n cfg -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ] && [ "$(kubectl get deploy/web -n cfg -o jsonpath='\''{.spec.template.spec.containers[0].env}'\'' 2>/dev/null)" = '\'''\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

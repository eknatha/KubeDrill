#!/usr/bin/env bash
# KubeDrill lab pack: Taints, tolerations and nodeSelector (s07-scheduling)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Label worker1 with accelerator=gpu'
chk 'Label worker1 with accelerator=gpu' '[ "$(kubectl get node/worker1 -o jsonpath='\''{.metadata.labels.accelerator}'\'' 2>/dev/null)" = '\''gpu'\'' ]'
echo 'Task 2: Add a toleration for dedicated=ml:NoSchedule to the Deployment'
chk 'Add a toleration for dedicated=ml:NoSchedule to the Deployment' '[ "$(kubectl get deploy/trainer -n ml -o jsonpath='\''{.spec.template.spec.tolerations[0].key}'\'' 2>/dev/null)" = '\''dedicated'\'' ] && [ "$(kubectl get node/worker1 -o jsonpath='\''{.spec.taints[0].key}'\'' 2>/dev/null)" = '\''dedicated'\'' ]'
echo 'Task 3: Both replicas Ready (on worker1)'
chk 'Both replicas Ready (on worker1)' '[ "$(kubectl get pods -n ml -l app=trainer -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

#!/usr/bin/env bash
# KubeLab lab pack: Nothing resolves: CoreDNS scaled to zero (s82-coredns-down)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find why names do not resolve'
chk 'Find why names do not resolve' 'kubectl get service/kube-dns -n kube-system >/dev/null 2>&1'
echo 'Task 2: Restore CoreDNS to 2 replicas'
chk 'Restore CoreDNS to 2 replicas' '[ "$(kubectl get pods -n kube-system -l k8s-app=kube-dns -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 3: client reaches server by name'
chk 'client reaches server by name' 'kubectl exec -n shop client -- wget -qO- -T 3 server:80 >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

#!/usr/bin/env bash
# KubeDrill lab pack: Job: completions, parallelism and a deadline (s103-job-parallel)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Job exists with 6 completions, 2 parallel'
chk 'Job exists with 6 completions, 2 parallel' '[ "$(kubectl get job/import -n jobs2 -o jsonpath='\''{.spec.completions}'\'' 2>/dev/null)" = '\''6'\'' ] && [ "$(kubectl get job/import -n jobs2 -o jsonpath='\''{.spec.parallelism}'\'' 2>/dev/null)" = '\''2'\'' ]'
echo 'Task 2: Retries and deadline set'
chk 'Retries and deadline set' '[ "$(kubectl get job/import -n jobs2 -o jsonpath='\''{.spec.backoffLimit}'\'' 2>/dev/null)" = '\''2'\'' ] && [ "$(kubectl get job/import -n jobs2 -o jsonpath='\''{.spec.activeDeadlineSeconds}'\'' 2>/dev/null)" = '\''120'\'' ]'
echo 'Task 3: Pods restart OnFailure'
chk 'Pods restart OnFailure' '[ "$(kubectl get job/import -n jobs2 -o jsonpath='\''{.spec.template.spec.restartPolicy}'\'' 2>/dev/null)" = '\''OnFailure'\'' ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail

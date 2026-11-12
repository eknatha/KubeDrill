#!/usr/bin/env bash
# KubeDrill lab pack: Job: completions, parallelism and a deadline (s103-job-parallel)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Job: completions, parallelism and a deadline"
kubectl create namespace jobs2 --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: jobs2

KUBEDRILL_EOF


kubectl config set-context --current --namespace=jobs2 >/dev/null
echo "✔ Ready. Namespace: jobs2. Read README.md, fix the cluster, then run ./check.sh"

#!/usr/bin/env bash
# KubeLab lab pack: Jobs and CronJobs (s09-jobs)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Jobs and CronJobs"
kubectl create namespace jobs --dry-run=client -o yaml | kubectl apply -f -



kubectl config set-context --current --namespace=jobs >/dev/null
echo "✔ Ready. Namespace: jobs. Read README.md, fix the cluster, then run ./check.sh"

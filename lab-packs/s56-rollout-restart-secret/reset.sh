#!/usr/bin/env bash
# KubeDrill lab pack: Rotate a Secret and restart the workload (s56-rollout-restart-secret)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace rot --ignore-not-found


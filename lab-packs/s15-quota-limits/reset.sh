#!/usr/bin/env bash
# KubeDrill lab pack: ResourceQuota blocks the rollout (s15-quota-limits)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace team-a --ignore-not-found


#!/usr/bin/env bash
# KubeLab lab pack: Bad rollout: undo, scale, then upgrade (s06-rollout-rollback)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace release --ignore-not-found


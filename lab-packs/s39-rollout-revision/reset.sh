#!/usr/bin/env bash
# KubeLab lab pack: Roll back to a specific revision (s39-rollout-revision)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace rel --ignore-not-found


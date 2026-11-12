#!/usr/bin/env bash
# KubeLab lab pack: Rollout strategy: never lose capacity (s107-rolling-strategy)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace rolls --ignore-not-found


#!/usr/bin/env bash
# KubeDrill lab pack: Pending: nodeSelector matches no node (s34-nodeselector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace sched --ignore-not-found


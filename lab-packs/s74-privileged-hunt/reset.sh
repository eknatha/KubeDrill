#!/usr/bin/env bash
# KubeLab lab pack: Hunt the privileged workloads (s74-privileged-hunt)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace payments --ignore-not-found


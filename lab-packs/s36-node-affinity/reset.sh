#!/usr/bin/env bash
# KubeLab lab pack: Required node affinity with no matching node (s36-node-affinity)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace zone --ignore-not-found


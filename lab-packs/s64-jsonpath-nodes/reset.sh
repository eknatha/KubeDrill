#!/usr/bin/env bash
# KubeLab lab pack: JSONPath: extract node names and images (s64-jsonpath-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace jp --ignore-not-found


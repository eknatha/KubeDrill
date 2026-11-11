#!/usr/bin/env bash
# KubeLab lab pack: Mount a ConfigMap as a file (s33-cm-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace files --ignore-not-found


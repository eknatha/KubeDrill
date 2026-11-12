#!/usr/bin/env bash
# KubeDrill lab pack: Fix a manifest that uses a removed API version (s108-old-apiversion)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace legacy2 --ignore-not-found


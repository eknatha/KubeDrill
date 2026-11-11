#!/usr/bin/env bash
# KubeLab lab pack: Missing ConfigMap key breaks the pod (s32-cm-env-missing)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace cfg --ignore-not-found


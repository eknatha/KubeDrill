#!/usr/bin/env bash
# KubeLab lab pack: HPA points at the wrong Deployment (s45-hpa-wrong-target)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace scale --ignore-not-found


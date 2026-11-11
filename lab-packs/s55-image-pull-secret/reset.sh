#!/usr/bin/env bash
# KubeLab lab pack: ImagePullBackOff from a private registry (s55-image-pull-secret)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace priv --ignore-not-found


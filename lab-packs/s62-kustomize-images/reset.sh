#!/usr/bin/env bash
# KubeDrill lab pack: Kustomize: override the image tag (s62-kustomize-images)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace img --ignore-not-found


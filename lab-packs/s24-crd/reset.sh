#!/usr/bin/env bash
# KubeDrill lab pack: Extend Kubernetes: CRD + custom resource (s24-crd)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ops --ignore-not-found


#!/usr/bin/env bash
# KubeDrill lab pack: Harden a pod's securityContext (s77-hardened-pod)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace secure --ignore-not-found


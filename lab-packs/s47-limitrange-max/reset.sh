#!/usr/bin/env bash
# KubeDrill lab pack: LimitRange rejects the pod (s47-limitrange-max)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace lr --ignore-not-found


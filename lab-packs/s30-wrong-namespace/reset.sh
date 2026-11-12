#!/usr/bin/env bash
# KubeDrill lab pack: Deployed into the wrong namespace (s30-wrong-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace staging --ignore-not-found
kubectl delete namespace default --ignore-not-found


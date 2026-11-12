#!/usr/bin/env bash
# KubeDrill lab pack: Spread replicas with pod anti-affinity (s37-pod-antiaffinity)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace spread --ignore-not-found


#!/usr/bin/env bash
# KubeDrill lab pack: Init:CrashLoopBackOff — failing init container (s31-init-container)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace boot --ignore-not-found


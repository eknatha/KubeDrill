#!/usr/bin/env bash
# KubeLab lab pack: Find the pod that keeps restarting (s67-find-restarts)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace rs --ignore-not-found


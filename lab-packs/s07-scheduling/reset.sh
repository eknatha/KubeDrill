#!/usr/bin/env bash
# KubeLab lab pack: Taints, tolerations and nodeSelector (s07-scheduling)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ml --ignore-not-found
kubectl taint nodes worker1 dedicated- || true
kubectl label node worker1 accelerator- || true

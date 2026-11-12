#!/usr/bin/env bash
# KubeDrill lab pack: Autoscale a Deployment with HPA (s16-hpa)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace web --ignore-not-found


#!/usr/bin/env bash
# KubeLab lab pack: StatefulSet needs a headless Service (s43-headless-service)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ss --ignore-not-found


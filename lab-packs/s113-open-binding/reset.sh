#!/usr/bin/env bash
# KubeDrill lab pack: Hardening: an over-broad binding and the default ServiceAccount (s113-open-binding)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace team --ignore-not-found


#!/usr/bin/env bash
# KubeLab lab pack: Scan images and replace the vulnerable ones (s27-image-scan)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace scan --ignore-not-found


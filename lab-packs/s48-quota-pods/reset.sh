#!/usr/bin/env bash
# KubeLab lab pack: Pod-count quota blocks scaling (s48-quota-pods)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace qt --ignore-not-found


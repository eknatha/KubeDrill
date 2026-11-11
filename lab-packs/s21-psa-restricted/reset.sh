#!/usr/bin/env bash
# KubeLab lab pack: Pod Security Admission: restricted namespace (s21-psa-restricted)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace secure --ignore-not-found


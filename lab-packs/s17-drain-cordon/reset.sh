#!/usr/bin/env bash
# KubeLab lab pack: Node maintenance: cordon and drain (s17-drain-cordon)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace app --ignore-not-found


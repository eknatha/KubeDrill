#!/usr/bin/env bash
# KubeLab lab pack: Default-deny, then allow only what is needed (s110-default-deny)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace zt --ignore-not-found


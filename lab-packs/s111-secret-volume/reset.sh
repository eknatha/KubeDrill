#!/usr/bin/env bash
# KubeDrill lab pack: Stop leaking secrets through env vars (s111-secret-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace vault --ignore-not-found


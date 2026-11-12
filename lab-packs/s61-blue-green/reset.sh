#!/usr/bin/env bash
# KubeDrill lab pack: Blue/green switch by Service selector (s61-blue-green)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace bg --ignore-not-found


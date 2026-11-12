#!/usr/bin/env bash
# KubeDrill lab pack: Incident: capacity crunch (s94-capacity-crunch)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace prod --ignore-not-found


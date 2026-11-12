#!/usr/bin/env bash
# KubeDrill lab pack: Incident: the release that never finishes (s93-release-gone-wrong)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace rel --ignore-not-found


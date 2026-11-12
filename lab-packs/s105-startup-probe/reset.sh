#!/usr/bin/env bash
# KubeLab lab pack: Slow starter: add a startup probe (s105-startup-probe)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace slow --ignore-not-found


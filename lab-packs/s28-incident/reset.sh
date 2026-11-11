#!/usr/bin/env bash
# KubeLab lab pack: Incident: three faults, one outage (s28-incident)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace prod --ignore-not-found


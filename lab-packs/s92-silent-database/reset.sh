#!/usr/bin/env bash
# KubeDrill lab pack: Incident: the silent database (s92-silent-database)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace data --ignore-not-found


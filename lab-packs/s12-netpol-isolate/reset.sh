#!/usr/bin/env bash
# KubeLab lab pack: NetworkPolicy: lock down the database (s12-netpol-isolate)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace app --ignore-not-found


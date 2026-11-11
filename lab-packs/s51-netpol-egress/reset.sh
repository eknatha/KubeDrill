#!/usr/bin/env bash
# KubeLab lab pack: NetworkPolicy egress: allow only the API (s51-netpol-egress)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace eg --ignore-not-found


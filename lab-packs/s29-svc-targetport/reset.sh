#!/usr/bin/env bash
# KubeLab lab pack: Service reachable but requests fail: wrong targetPort (s29-svc-targetport)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace route --ignore-not-found


#!/usr/bin/env bash
# KubeDrill lab pack: Drain a node that holds a bare pod (s98-drain-bare-pod)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ops --ignore-not-found


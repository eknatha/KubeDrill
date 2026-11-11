#!/usr/bin/env bash
# KubeLab lab pack: DaemonSet only runs on one node (s42-daemonset-all-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace agents --ignore-not-found


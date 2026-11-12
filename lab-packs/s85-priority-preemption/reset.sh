#!/usr/bin/env bash
# KubeDrill lab pack: Critical pods Pending: priority and preemption (s85-priority-preemption)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace batch --ignore-not-found


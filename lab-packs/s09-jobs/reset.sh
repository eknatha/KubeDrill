#!/usr/bin/env bash
# KubeLab lab pack: Jobs and CronJobs (s09-jobs)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace jobs --ignore-not-found


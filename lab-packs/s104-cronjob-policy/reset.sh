#!/usr/bin/env bash
# KubeLab lab pack: CronJob: no overlap, tidy history (s104-cronjob-policy)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace cron --ignore-not-found


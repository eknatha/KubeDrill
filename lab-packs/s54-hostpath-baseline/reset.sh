#!/usr/bin/env bash
# KubeLab lab pack: hostPath volume blocked by Pod Security (s54-hostpath-baseline)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace hp --ignore-not-found


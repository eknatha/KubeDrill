#!/usr/bin/env bash
# KubeDrill lab pack: Prod is down: ImagePullBackOff (s02-imagepull)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace shop --ignore-not-found


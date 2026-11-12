#!/usr/bin/env bash
# KubeDrill lab pack: Imperative speed run (CKAD style) (s66-imperative-speedrun)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace fast --ignore-not-found


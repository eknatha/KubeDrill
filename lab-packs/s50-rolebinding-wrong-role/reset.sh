#!/usr/bin/env bash
# KubeDrill lab pack: RoleBinding points at the wrong Role (s50-rolebinding-wrong-role)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace team --ignore-not-found


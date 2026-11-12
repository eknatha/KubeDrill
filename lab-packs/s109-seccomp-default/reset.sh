#!/usr/bin/env bash
# KubeDrill lab pack: System hardening: seccomp RuntimeDefault (s109-seccomp-default)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace sys --ignore-not-found


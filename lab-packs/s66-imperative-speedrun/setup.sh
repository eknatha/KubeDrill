#!/usr/bin/env bash
# KubeDrill lab pack: Imperative speed run (CKAD style) (s66-imperative-speedrun)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Imperative speed run (CKAD style)"
kubectl create namespace fast --dry-run=client -o yaml | kubectl apply -f -



kubectl config set-context --current --namespace=fast >/dev/null
echo "✔ Ready. Namespace: fast. Read README.md, fix the cluster, then run ./check.sh"

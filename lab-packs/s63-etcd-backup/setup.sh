#!/usr/bin/env bash
# KubeLab lab pack: Back up etcd with a snapshot (s63-etcd-backup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Back up etcd with a snapshot"
kubectl create namespace kube-system --dry-run=client -o yaml | kubectl apply -f -



kubectl config set-context --current --namespace=kube-system >/dev/null
echo "✔ Ready. Namespace: kube-system. Read README.md, fix the cluster, then run ./check.sh"

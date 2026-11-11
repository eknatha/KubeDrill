#!/usr/bin/env bash
# KubeLab lab pack: DaemonSet only runs on one node (s42-daemonset-all-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: DaemonSet only runs on one node"
kubectl create namespace agents --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: logger
  namespace: agents
spec:
  selector:
    matchLabels:
      app: logger
  template:
    metadata:
      labels:
        app: logger
    spec:
      nodeSelector:
        role: logging
      containers:
      - name: logger
        image: busybox:1.36
        command: ["sleep", "3600"]

KUBELAB_EOF


kubectl config set-context --current --namespace=agents >/dev/null
echo "✔ Ready. Namespace: agents. Read README.md, fix the cluster, then run ./check.sh"

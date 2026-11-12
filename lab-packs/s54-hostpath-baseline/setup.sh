#!/usr/bin/env bash
# KubeDrill lab pack: hostPath volume blocked by Pod Security (s54-hostpath-baseline)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: hostPath volume blocked by Pod Security"
kubectl create namespace hp --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: hp
  labels:
    pod-security.kubernetes.io/enforce: baseline

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: logger
  namespace: hp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: logger
  template:
    metadata:
      labels:
        app: logger
    spec:
      volumes:
      - name: logs
        hostPath:
          path: /var/log
      containers:
      - name: logger
        image: nginx:1.25
        volumeMounts:
        - {name: logs, mountPath: /logs}

KUBEDRILL_EOF


kubectl config set-context --current --namespace=hp >/dev/null
echo "✔ Ready. Namespace: hp. Read README.md, fix the cluster, then run ./check.sh"

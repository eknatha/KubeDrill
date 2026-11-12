#!/usr/bin/env bash
# KubeDrill lab pack: Drain a node that holds a bare pod (s98-drain-bare-pod)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Drain a node that holds a bare pod"
kubectl create namespace ops --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: ops

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: ops
spec:
  replicas: 4
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: legacy-job
  namespace: ops
  labels:
    app: legacy
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]
  nodeName: worker1

KUBEDRILL_EOF


kubectl config set-context --current --namespace=ops >/dev/null
echo "✔ Ready. Namespace: ops. Read README.md, fix the cluster, then run ./check.sh"

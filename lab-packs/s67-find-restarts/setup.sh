#!/usr/bin/env bash
# KubeDrill lab pack: Find the pod that keeps restarting (s67-find-restarts)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Find the pod that keeps restarting"
kubectl create namespace rs --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: steady
  namespace: rs
  labels:
    app: steady
spec:
  containers:
  - name: steady
    image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: flaky
  namespace: rs
  labels:
    app: flaky
spec:
  containers:
  - name: flaky
    image: busybox:1.36
    command: ["sh", "-c", "exit 1"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: calm
  namespace: rs
  labels:
    app: calm
spec:
  containers:
  - name: calm
    image: nginx:1.25

KUBEDRILL_EOF


kubectl config set-context --current --namespace=rs >/dev/null
echo "✔ Ready. Namespace: rs. Read README.md, fix the cluster, then run ./check.sh"

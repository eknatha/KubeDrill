#!/usr/bin/env bash
# KubeLab lab pack: CrashLoopBackOff: OOMKilled (s03-oomkilled)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CrashLoopBackOff: OOMKilled"
kubectl create namespace batch --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: batch
spec:
  replicas: 2
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: polinux/stress
        command: ["stress"]
        args: ["--vm", "1", "--vm-bytes", "150M", "--vm-hang", "1"]
        resources:
          requests:
            memory: 64Mi
          limits:
            memory: 100Mi

KUBELAB_EOF


kubectl config set-context --current --namespace=batch >/dev/null
echo "✔ Ready. Namespace: batch. Read README.md, fix the cluster, then run ./check.sh"

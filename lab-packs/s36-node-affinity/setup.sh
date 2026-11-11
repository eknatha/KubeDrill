#!/usr/bin/env bash
# KubeLab lab pack: Required node affinity with no matching node (s36-node-affinity)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Required node affinity with no matching node"
kubectl create namespace zone --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
  namespace: zone
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values: ["zone-a"]
      containers:
      - name: cache
        image: nginx:1.25

KUBELAB_EOF


kubectl config set-context --current --namespace=zone >/dev/null
echo "✔ Ready. Namespace: zone. Read README.md, fix the cluster, then run ./check.sh"

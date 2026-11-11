#!/usr/bin/env bash
# KubeLab lab pack: Liveness and readiness probes (s08-probes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Liveness and readiness probes"
kubectl create namespace probes --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: site
  namespace: probes
spec:
  replicas: 2
  selector:
    matchLabels:
      app: site
  template:
    metadata:
      labels:
        app: site
    spec:
      containers:
      - name: site
        image: nginx:1.25
        livenessProbe:
          httpGet:
            path: /healthz
            port: 80
          initialDelaySeconds: 1

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: probes
spec:
  replicas: 2
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
        readinessProbe:
          httpGet:
            path: /
            port: 8080

KUBELAB_EOF


kubectl config set-context --current --namespace=probes >/dev/null
echo "✔ Ready. Namespace: probes. Read README.md, fix the cluster, then run ./check.sh"

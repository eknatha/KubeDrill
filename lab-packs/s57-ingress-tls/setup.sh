#!/usr/bin/env bash
# KubeDrill lab pack: Ingress with TLS termination (s57-ingress-tls)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Ingress with TLS termination"
kubectl create namespace sec --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: sec
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: sec
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: sec
spec:
  ingressClassName: nginx
  rules:
  - host: secure.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80

KUBEDRILL_EOF
echo "-----BEGIN CERTIFICATE-----" > tls.crt
echo "-----BEGIN PRIVATE KEY-----" > tls.key

kubectl config set-context --current --namespace=sec >/dev/null
echo "✔ Ready. Namespace: sec. Read README.md, fix the cluster, then run ./check.sh"

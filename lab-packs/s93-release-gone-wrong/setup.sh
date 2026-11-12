#!/usr/bin/env bash
# KubeDrill lab pack: Incident: the release that never finishes (s93-release-gone-wrong)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Incident: the release that never finishes"
kubectl create namespace rel --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: rel

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portal
  namespace: rel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: portal
  template:
    metadata:
      labels:
        app: portal
    spec:
      containers:
      - name: app
        image: nginx:1.25


KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: portal-config
  namespace: rel
data:
  APP_MODE: prod

KUBEDRILL_EOF
kubectl patch deploy portal -n rel --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/readinessProbe","value":{"httpGet":{"path":"/ready","port":80},"initialDelaySeconds":1}},{"op":"add","path":"/spec/template/spec/containers/0/env","value":[{"name":"FEATURE_FLAGS","valueFrom":{"configMapKeyRef":{"name":"portal-config","key":"FEATURE_FLAGS"}}}]}]'

kubectl config set-context --current --namespace=rel >/dev/null
echo "✔ Ready. Namespace: rel. Read README.md, fix the cluster, then run ./check.sh"

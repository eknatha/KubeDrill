#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet: scale with stable storage (s14-statefulset-pvc)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: StatefulSet: scale with stable storage"
kubectl create namespace db --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: kv
  namespace: db
spec:
  clusterIP: None
  selector:
    app: kv
  ports:
  - port: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: kv
  namespace: db
spec:
  serviceName: kv
  replicas: 1
  selector:
    matchLabels:
      app: kv
  template:
    metadata:
      labels:
        app: kv
    spec:
      containers:
      - name: kv
        image: nginx:1.25
        volumeMounts:
        - {name: data, mountPath: /data}
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ReadWriteOnce]
      resources:
        requests:
          storage: 1Gi

KUBEDRILL_EOF


kubectl config set-context --current --namespace=db >/dev/null
echo "✔ Ready. Namespace: db. Read README.md, fix the cluster, then run ./check.sh"

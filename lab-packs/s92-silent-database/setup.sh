#!/usr/bin/env bash
# KubeLab lab pack: Incident: the silent database (s92-silent-database)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Incident: the silent database"
kubectl create namespace data --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: data

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
  namespace: data
spec:
  storageClassName: fast
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: data
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: db
        image: nginx:1.25
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-creds
              key: password
        volumeMounts:
        - name: d
          mountPath: /data
      volumes:
      - name: d
        persistentVolumeClaim:
          claimName: db-data


KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: data
spec:
  selector:
    app: db
  ports:
  - port: 80
    targetPort: 80

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-lockdown
  namespace: data
spec:
  podSelector:
    matchLabels:
      app: db
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: backup

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: app
  namespace: data
  labels:
    app: app
spec:
  containers:
  - name: app
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBELAB_EOF


kubectl config set-context --current --namespace=data >/dev/null
echo "✔ Ready. Namespace: data. Read README.md, fix the cluster, then run ./check.sh"

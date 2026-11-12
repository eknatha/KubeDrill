#!/usr/bin/env bash
# KubeDrill lab pack: ExternalName Service for an outside database (s59-externalname)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: ExternalName Service for an outside database"
kubectl create namespace ext --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: legacy-db
  namespace: ext
spec:
  selector:
    app: nothing
  ports:
  - port: 5432
    targetPort: 5432

KUBEDRILL_EOF


kubectl config set-context --current --namespace=ext >/dev/null
echo "✔ Ready. Namespace: ext. Read README.md, fix the cluster, then run ./check.sh"

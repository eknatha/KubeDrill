#!/usr/bin/env bash
# KubeLab lab pack: Read the audit log: who touched the secret? (s112-audit-hunt)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Read the audit log: who touched the secret?"
kubectl create namespace audit --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: audit

KUBELAB_EOF

cat > 'audit.log' <<'KUBELAB_EOF'
user=alice verb=list resource=pods name=- code=200
user=bob verb=get resource=secrets name=web-tls code=200
user=mallory verb=get resource=secrets name=prod-db code=403
user=mallory verb=get resource=secrets name=prod-db code=200
user=carol verb=delete resource=pods name=api-1 code=200
user=dave verb=list resource=secrets name=- code=403
user=alice verb=get resource=configmaps name=app code=200
user=bob verb=get resource=secrets name=prod-db code=403

KUBELAB_EOF
kubectl config set-context --current --namespace=audit >/dev/null
echo "✔ Ready. Namespace: audit. Read README.md, fix the cluster, then run ./check.sh"

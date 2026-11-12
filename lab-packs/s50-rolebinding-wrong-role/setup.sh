#!/usr/bin/env bash
# KubeDrill lab pack: RoleBinding points at the wrong Role (s50-rolebinding-wrong-role)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: RoleBinding points at the wrong Role"
kubectl create namespace team --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dev
  namespace: team

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: viewer
  namespace: team
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: editor
  namespace: team
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dev-bind
  namespace: team
subjects:
- kind: ServiceAccount
  name: dev
  namespace: team
roleRef:
  kind: Role
  name: viewer
  apiGroup: rbac.authorization.k8s.io

KUBEDRILL_EOF


kubectl config set-context --current --namespace=team >/dev/null
echo "✔ Ready. Namespace: team. Read README.md, fix the cluster, then run ./check.sh"

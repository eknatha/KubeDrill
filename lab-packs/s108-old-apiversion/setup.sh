#!/usr/bin/env bash
# KubeLab lab pack: Fix a manifest that uses a removed API version (s108-old-apiversion)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Fix a manifest that uses a removed API version"
kubectl create namespace legacy2 --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: legacy2

KUBELAB_EOF

cat > 'old-cron.yaml' <<'KUBELAB_EOF'
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: nightly
  namespace: legacy2
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: c
            image: busybox:1.36
            command: ["echo", "nightly"]

KUBELAB_EOF
kubectl config set-context --current --namespace=legacy2 >/dev/null
echo "✔ Ready. Namespace: legacy2. Read README.md, fix the cluster, then run ./check.sh"

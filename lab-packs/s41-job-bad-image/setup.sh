#!/usr/bin/env bash
# KubeLab lab pack: Job stuck: ImagePullBackOff (s41-job-bad-image)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Job stuck: ImagePullBackOff"
kubectl create namespace jobs --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate
  namespace: jobs
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: busybox:doesnotexist
        command: ["sh", "-c", "echo migrated"]

KUBELAB_EOF


kubectl config set-context --current --namespace=jobs >/dev/null
echo "✔ Ready. Namespace: jobs. Read README.md, fix the cluster, then run ./check.sh"

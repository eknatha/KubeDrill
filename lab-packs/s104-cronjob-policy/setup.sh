#!/usr/bin/env bash
# KubeLab lab pack: CronJob: no overlap, tidy history (s104-cronjob-policy)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CronJob: no overlap, tidy history"
kubectl create namespace cron --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cron

KUBELAB_EOF
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup
  namespace: cron
spec:
  schedule: "* * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: c
            image: busybox:1.36
            command: ["sh", "-c", "echo cleaning"]

KUBELAB_EOF


kubectl config set-context --current --namespace=cron >/dev/null
echo "✔ Ready. Namespace: cron. Read README.md, fix the cluster, then run ./check.sh"

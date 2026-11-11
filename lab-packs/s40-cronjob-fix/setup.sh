#!/usr/bin/env bash
# KubeLab lab pack: CronJob never runs: suspended + wrong schedule (s40-cronjob-fix)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CronJob never runs: suspended + wrong schedule"
kubectl create namespace cron --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBELAB_EOF'
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup
  namespace: cron
spec:
  schedule: "0 0 1 1 *"
  suspend: true
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: busybox:1.36
            command: ["sh", "-c", "echo backing up"]

KUBELAB_EOF


kubectl config set-context --current --namespace=cron >/dev/null
echo "✔ Ready. Namespace: cron. Read README.md, fix the cluster, then run ./check.sh"

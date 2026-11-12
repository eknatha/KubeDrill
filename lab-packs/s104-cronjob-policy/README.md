# CronJob: no overlap, tidy history

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `cron`

CronJob `cleanup` runs every minute and overlapping runs are corrupting data. Change it to run every 10 minutes, forbid overlapping runs, keep 1 successful and 2 failed jobs, and skip a run that is more than 60 seconds late.

## Tasks

1. **Schedule is every 10 minutes** — 
2. **Overlaps are forbidden** — 
3. **History 1 success / 2 failed, 60s start deadline** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl patch cronjob cleanup -n cron -p '{"spec":{"schedule":"*/10 * * * *"}}'`
</details>

<details><summary>Task 2 hints</summary>

1. `spec.concurrencyPolicy: Forbid`
</details>

<details><summary>Task 3 hints</summary>

1. `successfulJobsHistoryLimit`, `failedJobsHistoryLimit`, `startingDeadlineSeconds`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch cronjob cleanup -n cron -p '{"spec":{"schedule":"*/10 * * * *","concurrencyPolicy":"Forbid","successfulJobsHistoryLimit":1,"failedJobsHistoryLimit":2,"startingDeadlineSeconds":60}}'
kubectl get cronjob cleanup -n cron
```
</details>

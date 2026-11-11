# CronJob never runs: suspended + wrong schedule

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `cron`

CronJob `backup` should run every 15 minutes but is suspended and scheduled yearly. Fix both.

## Tasks

1. **Schedule is every 15 minutes** — 
2. **Not suspended** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get cronjob backup`
2. `kubectl patch cronjob backup -p '{"spec":{"schedule":"*/15 * * * *"}}'`
3. "*/15 * * * *"
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl patch cronjob backup -p '{"spec":{"suspend":false}}'`
2. SUSPEND column in `kubectl get cj`.
3. There is no `kubectl resume` for cronjobs.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch cronjob backup -n cron -p '{"spec":{"schedule":"*/15 * * * *","suspend":false}}'
kubectl get cronjob -n cron
```
</details>

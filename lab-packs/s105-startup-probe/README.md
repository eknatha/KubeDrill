# Slow starter: add a startup probe

**Track:** CKAD · **Level:** Advanced · **Time:** 12 min · **Namespace:** `slow`

Deployment `legacy` needs up to 5 minutes to start. Its liveness probe kills it before it is ready. Do NOT loosen the liveness probe; add a startup probe on `/` port 80 with `periodSeconds: 10` and `failureThreshold: 30`, so liveness only begins after startup succeeds.

## Tasks

1. **Startup probe on `/`:80** — 
2. **Allows 5 minutes (period 10 × threshold 30)** — 
3. **Liveness probe unchanged, pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.containers.startupProbe`
2. Add under the container: startupProbe.httpGet path / port 80.
</details>

<details><summary>Task 2 hints</summary>

1. `periodSeconds: 10`, `failureThreshold: 30`
</details>

<details><summary>Task 3 hints</summary>

1. Keep `periodSeconds: 5` on liveness.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment legacy -n slow --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/startupProbe","value":{"httpGet":{"path":"/","port":80},"periodSeconds":10,"failureThreshold":30}}]'
kubectl rollout status deployment/legacy -n slow
```
</details>

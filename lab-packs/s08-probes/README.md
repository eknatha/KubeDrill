# Liveness and readiness probes

**Track:** CKAD · **Level:** Beginner · **Time:** 15 min · **Namespace:** `probes`

Two services misbehave. `site` is restarted forever by a liveness probe hitting a missing path. `api` never becomes Ready because its readiness probe checks the wrong port.

## Tasks

1. **Fix the liveness probe of `site` (path /)** — nginx serves 404 on /healthz.
2. **Fix the readiness probe port of `api` (80)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod -l app=site` → "Liveness probe failed: HTTP probe failed with statuscode: 404".
2. `kubectl patch deployment site --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/path","value":"/"}]'`
3. Or `kubectl edit deployment site`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl describe pod -l app=api` → connection refused on 8080.
2. nginx listens on 80.
3. `kubectl patch deployment api --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment site --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/livenessProbe/httpGet/path","value":"/"}]'
kubectl patch deployment api --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'
```
</details>

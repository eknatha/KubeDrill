# Incident: the release that never finishes

**Track:** CKAD, CKA · **Level:** Advanced · **Time:** 18 min · **Namespace:** `rel`

Incident rules: stabilise first, then fix root causes, change one thing at a time, and write down what you changed. **16:55 on a Friday.** Release v2 of `portal` is stuck: new pods never become Ready and the rollout will not complete. The probe and the configuration are both wrong. Finish the rollout without taking down the healthy v1 pods first.

## Tasks

1. **Find why v2 pods are not Ready** — 
2. **Config: add the missing key** — 
3. **Probe: use a path that exists** — 
4. **Rollout completes: 3 Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl rollout status deploy/portal -n rel`
2. `kubectl describe pod -n rel -l app=portal`
3. Two causes: a config key and a probe path.
</details>

<details><summary>Task 2 hints</summary>

1. ConfigMap `portal-config` lacks `FEATURE_FLAGS`.
2. `kubectl patch cm portal-config -n rel -p '{"data":{"FEATURE_FLAGS":"none"}}'`
</details>

<details><summary>Task 3 hints</summary>

1. nginx serves `/`, not `/ready`.
2. `kubectl patch deploy portal -n rel --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"}]'`
</details>

<details><summary>Task 4 hints</summary>

1. `kubectl rollout status deploy/portal -n rel`
</details>

<details><summary>Solution</summary>

```bash
kubectl rollout status deploy/portal -n rel --timeout=5s
kubectl patch cm portal-config -n rel -p '{"data":{"FEATURE_FLAGS":"none"}}'
kubectl patch deploy portal -n rel --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"}]'
kubectl rollout restart deploy/portal -n rel
kubectl get pods -n rel
```
</details>

# CreateContainerConfigError: missing ConfigMap

**Track:** CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `inventory`

The `app` Deployment reads `LOG_LEVEL` from ConfigMap `app-config` — which was never created. Pods are stuck. Create the ConfigMap (LOG_LEVEL=debug) and verify the pods read it.

## Tasks

1. **Create ConfigMap `app-config` with LOG_LEVEL=debug** — One imperative command is enough.
2. **Both pods become Ready** — Kubelet retries automatically once the ConfigMap exists.
3. **Prove the env var inside a pod** — `kubectl exec deploy/app -- printenv LOG_LEVEL` prints debug.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod` → "configmap \"app-config\" not found".
2. `kubectl create configmap app-config --from-literal=LOG_LEVEL=debug`
3. Verify: `kubectl get cm app-config -o yaml`.
</details>

<details><summary>Task 2 hints</summary>

1. Wait a few seconds.
2. `kubectl get pods`
3. If still failing: `kubectl describe pod` for the next error.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl exec deploy/app -- printenv LOG_LEVEL`
2. ConfigMap changes are NOT picked up by env vars of running pods.
3. Restart with `kubectl rollout restart deploy/app` if you change it later.
</details>

<details><summary>Solution</summary>

```bash
kubectl create configmap app-config --from-literal=LOG_LEVEL=debug
kubectl get pods
kubectl exec deploy/app -- printenv LOG_LEVEL
```
</details>

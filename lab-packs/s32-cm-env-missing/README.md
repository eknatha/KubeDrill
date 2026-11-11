# Missing ConfigMap key breaks the pod

**Track:** CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `cfg`

Deployment `site` reads env `THEME` from ConfigMap `site-config` key `theme`. The ConfigMap does not exist, so the pods fail with CreateContainerConfigError.

## Tasks

1. **Create ConfigMap `site-config` with theme=dark** — 
2. **Pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod` → configmap "site-config" not found
2. `kubectl create configmap site-config --from-literal=theme=dark`
3. Namespace `cfg`.
</details>

<details><summary>Task 2 hints</summary>

1. Wait for the kubelet to retry.
2. `kubectl get pods -n cfg`
3. Fix the key name if it is wrong.
</details>

<details><summary>Solution</summary>

```bash
kubectl create configmap site-config --from-literal=theme=dark -n cfg
kubectl get pods -n cfg
```
</details>

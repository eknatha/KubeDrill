# StatefulSet: scale with stable storage

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `db`

StatefulSet `kv` runs 1 replica with a volumeClaimTemplate. Scale to 3 and confirm each pod gets its own PVC and a stable name.

## Tasks

1. **Scale `kv` to 3 replicas** — 
2. **Three PVCs exist (data-kv-0..2)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl scale statefulset kv --replicas=3`
2. Pods are created in order: kv-0, kv-1, kv-2.
3. `kubectl get pods -w`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pvc`
2. Each replica gets `<template>-<sts>-<ordinal>`.
3. PVCs outlive the pods when scaling down.
</details>

<details><summary>Solution</summary>

```bash
kubectl scale statefulset kv --replicas=3
kubectl get pvc
```
</details>

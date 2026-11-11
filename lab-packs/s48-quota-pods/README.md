# Pod-count quota blocks scaling

**Track:** CKA · **Level:** Beginner · **Time:** 8 min · **Namespace:** `qt`

ResourceQuota `count` allows 3 pods but Deployment `burst` wants 5. The business approved more: raise the quota to 6 pods so all 5 replicas run.

## Tasks

1. **Quota raised to 6 pods** — 
2. **5 replicas Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe quota count`
2. `kubectl patch resourcequota count -p '{"spec":{"hard":{"pods":"6"}}}'`
3. Or edit the object.
</details>

<details><summary>Task 2 hints</summary>

1. The ReplicaSet retries pod creation.
2. `kubectl get pods -n qt`
3. Wait a few seconds.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch resourcequota count -n qt -p '{"spec":{"hard":{"pods":"6"}}}'
kubectl get pods -n qt
```
</details>

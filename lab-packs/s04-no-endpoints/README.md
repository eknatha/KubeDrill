# Service has no endpoints

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `store`

Users get "connection refused" from `frontend-svc`. The Deployment is healthy, but the Service selects the wrong label. A `tester` pod is available to curl from inside the cluster.

## Tasks

1. **Show that the Service has no endpoints** — Compare `kubectl get endpoints frontend-svc` with the Pod labels.
2. **Fix the selector → ≥2 endpoints** — Patch or edit the Service.
3. **Curl the Service from the tester pod** — `kubectl exec tester -- wget -qO- frontend-svc` must return the nginx page.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get ep frontend-svc` → <none>.
2. `kubectl get pods --show-labels` shows `app=frontend`.
3. `kubectl describe svc frontend-svc` shows Selector: app=front-end.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl patch svc frontend-svc -p '{"spec":{"selector":{"app":"frontend"}}}'`
2. Alternatively `kubectl edit svc frontend-svc`.
3. `kubectl get ep frontend-svc`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl exec tester -- wget -qO- frontend-svc`
2. Same namespace → short DNS name works.
3. Cross-namespace: `frontend-svc.store.svc.cluster.local`.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch svc frontend-svc -p '{"spec":{"selector":{"app":"frontend"}}}'
kubectl get ep frontend-svc
kubectl exec tester -- wget -qO- frontend-svc
```
</details>

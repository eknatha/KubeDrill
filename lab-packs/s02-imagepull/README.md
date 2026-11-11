# Prod is down: ImagePullBackOff

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 8 min · **Namespace:** `shop`

A release pipeline pushed `nginx:1.255` — a tag that does not exist. The `web` Deployment in `shop` has no healthy pods. Roll forward with a valid image.

## Tasks

1. **Identify the failing image** — Find the exact error in the pod Events.
2. **Fix it: 3 Ready pods on a valid nginx tag** — Use `kubectl set image` so no YAML editing is needed.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n shop` → ErrImagePull / ImagePullBackOff.
2. `kubectl describe pod <pod> | grep -i -A2 failed`
3. The tag `1.255` does not exist in the registry.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl set image deployment/web web=nginx:1.25`
2. Container name is `web` (see `kubectl get deploy web -o wide`).
3. Verify with `kubectl rollout status deployment/web`.
</details>

<details><summary>Solution</summary>

```bash
kubectl set image deployment/web web=nginx:1.25
kubectl rollout status deployment/web
```
</details>

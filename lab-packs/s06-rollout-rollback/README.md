# Bad rollout: undo, scale, then upgrade

**Track:** CKAD, CKA · **Level:** Beginner · **Time:** 15 min · **Namespace:** `release`

A colleague pushed a broken image to `site`; the rollout is stuck with a new ImagePullBackOff pod while old pods still serve traffic. Roll back, scale to 4, then upgrade to `nginx:1.27`.

## Tasks

1. **Roll back the broken rollout** — Use rollout history/undo — do not edit the image by hand.
2. **Scale to 4 replicas** — 
3. **Upgrade to nginx:1.27 with all 4 pods Ready** — Watch the rolling update with `kubectl rollout status`.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl rollout history deployment/site`
2. `kubectl rollout undo deployment/site`
3. Check `kubectl get pods` — no ImagePullBackOff should remain.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl scale deployment/site --replicas=4`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl set image deployment/site site=nginx:1.27`
2. `kubectl rollout status deployment/site`
3. Old ReplicaSets stay around for rollback: `kubectl get rs`.
</details>

<details><summary>Solution</summary>

```bash
kubectl rollout undo deployment/site
kubectl scale deployment/site --replicas=4
kubectl set image deployment/site site=nginx:1.27
kubectl rollout status deployment/site
```
</details>

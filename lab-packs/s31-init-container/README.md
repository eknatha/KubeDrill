# Init:CrashLoopBackOff — failing init container

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `boot`

Deployment `app` has an init container `prep` whose command exits 1, so the main container never starts. Fix the init container so the pod becomes Ready.

## Tasks

1. **Identify the failing init container** — 
2. **Pod Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods` → Init:CrashLoopBackOff
2. `kubectl logs <pod> -c prep`
3. `kubectl describe pod` shows Init Containers: prep
</details>

<details><summary>Task 2 hints</summary>

1. Change the command to `echo preparing; exit 0` (or just `true`).
2. `kubectl patch` or re-apply the Deployment.
3. Init containers must finish with exit 0.
</details>

<details><summary>Solution</summary>

```bash
kubectl logs deploy/app -c prep
kubectl patch deployment app -p '{"spec":{"template":{"spec":{"initContainers":[{"name":"prep","command":["sh","-c","echo preparing; exit 0"]}]}}}}'
kubectl rollout status deployment/app
```
</details>

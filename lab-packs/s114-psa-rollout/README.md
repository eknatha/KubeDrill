# Pod Security: warn and audit before you enforce

**Track:** CKS · **Level:** Advanced · **Time:** 12 min · **Namespace:** `rollout-ns`

You will move namespace `rollout-ns` to the `restricted` Pod Security Standard, but existing workloads would break. Roll it out in stages: **enforce** `baseline` now, and set `warn` and `audit` to `restricted` so violations are reported without blocking. (Use the standard label keys `pod-security.kubernetes.io/<mode>`.)

## Tasks

1. **Namespace enforces `baseline`** — 
2. **`warn` and `audit` are `restricted`** — 
3. **Existing pods keep running** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl label ns rollout-ns pod-security.kubernetes.io/enforce=baseline`
</details>

<details><summary>Task 2 hints</summary>

1. Same label prefix, modes `warn` and `audit`.
</details>

<details><summary>Task 3 hints</summary>

1. Labels do not evict running pods; they affect new pods.
</details>

<details><summary>Solution</summary>

```bash
kubectl label ns rollout-ns pod-security.kubernetes.io/enforce=baseline pod-security.kubernetes.io/warn=restricted pod-security.kubernetes.io/audit=restricted
kubectl get ns rollout-ns --show-labels
```
</details>

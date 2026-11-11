# Canary release: 20% of traffic via replica ratio

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `can`

Service `shop` fronts Deployments `stable` (v1) and `canary` (v2), which currently run 3 replicas each (50% canary). Target ~20%: 4 stable + 1 canary.

## Tasks

1. **Scale the canary down to 1** — 
2. **Scale stable up to 4 — 5 Ready pods total** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. Traffic splits roughly by endpoint count.
2. `kubectl scale deployment canary --replicas=1`
3. `kubectl get endpoints shop`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl scale deployment stable --replicas=4`
2. 4 + 1 = 5 endpoints → canary gets 1/5 = 20%.
3. Verify with `kubectl get endpoints shop`.
</details>

<details><summary>Solution</summary>

```bash
kubectl scale deployment canary --replicas=1 -n can
kubectl scale deployment stable --replicas=4 -n can
kubectl get endpoints shop -n can
```
</details>

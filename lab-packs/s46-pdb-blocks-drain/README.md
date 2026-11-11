# PodDisruptionBudget blocks a node drain

**Track:** CKA · **Level:** Advanced · **Time:** 15 min · **Namespace:** `maint`

You must drain worker1, but PDB `guard` (minAvailable 3 on a 3-replica Deployment) allows zero disruptions. Fix the PDB (minAvailable 2), then drain worker1.

## Tasks

1. **PDB allows one disruption (minAvailable 2)** — 
2. **worker1 drained, 3 replicas still Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pdb` → ALLOWED DISRUPTIONS 0
2. `kubectl patch pdb guard -p '{"spec":{"minAvailable":2}}'`
3. minAvailable ≤ replicas-1 to permit drains.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data`
2. Pods move to worker2.
3. `kubectl get pods -o wide`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch pdb guard -n maint -p '{"spec":{"minAvailable":2}}'
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data
kubectl get pods -n maint -o wide
```
</details>

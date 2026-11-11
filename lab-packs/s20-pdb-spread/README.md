# High availability: PDB + topology spread

**Track:** CKA · **Level:** Intermediate · **Time:** 15 min · **Namespace:** `ha`

Deployment `checkout` (3 replicas) must survive node drains. Add a PodDisruptionBudget keeping ≥2 available, and a topologySpreadConstraint (maxSkew 1 across `kubernetes.io/hostname`).

## Tasks

1. **Create PDB `checkout-pdb` with minAvailable 2** — 
2. **Add topologySpreadConstraints (maxSkew 1)** — 
3. **3 replicas Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create pdb --help`
2. `kubectl create pdb checkout-pdb --selector=app=checkout --min-available=2`
3. Namespace `ha`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl edit deployment checkout` or patch.
2. Needs topologyKey, whenUnsatisfiable: DoNotSchedule, labelSelector.
3. Use `kubectl patch` with a JSON merge patch if you prefer.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get pods -o wide`
2. They spread over worker1/worker2.
3. Rollout finishes automatically.
</details>

<details><summary>Solution</summary>

```bash
kubectl create pdb checkout-pdb --selector=app=checkout --min-available=2 -n ha
kubectl patch deployment checkout -n ha -p '{"spec":{"template":{"spec":{"topologySpreadConstraints":[{"maxSkew":1,"topologyKey":"kubernetes.io/hostname","whenUnsatisfiable":"DoNotSchedule","labelSelector":{"matchLabels":{"app":"checkout"}}}]}}}}'
kubectl rollout status deployment/checkout -n ha
```
</details>

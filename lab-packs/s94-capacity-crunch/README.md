# Incident: capacity crunch

**Track:** CKA · **Level:** Advanced · **Time:** 18 min · **Namespace:** `prod`

Incident rules: stabilise first, then fix root causes, change one thing at a time, and write down what you changed. **04:05.** `orders` has 0 of 4 pods running. Last week's maintenance left a node cordoned, the pods request far more CPU than they use, and a PriorityClass the Deployment references was never created. Three scheduling blockers, one outage.

## Tasks

1. **Admission: the PriorityClass exists** — 
2. **Right-size the CPU request** — 
3. **Return worker1 to service** — 
4. **All 4 pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe rs -n prod` → no PriorityClass with name gold.
2. Create it: `value: 1000`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl describe pod -n prod -l app=orders` → Insufficient cpu.
2. Real usage is ~100m: `kubectl set resources deploy/orders -n prod --requests=cpu=100m`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get nodes` shows SchedulingDisabled.
2. `kubectl uncordon worker1`
</details>

<details><summary>Task 4 hints</summary>


</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: gold
value: 1000
EOF
kubectl set resources deploy/orders -n prod --requests=cpu=100m
kubectl uncordon worker1
kubectl get pods -n prod
```
</details>

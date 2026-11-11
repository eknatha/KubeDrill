# Required node affinity with no matching node

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `zone`

Deployment `cache` requires node affinity `topology.kubernetes.io/zone In [zone-a]`. No node has that label. Label worker1 with `topology.kubernetes.io/zone=zone-a`.

## Tasks

1. **worker1 labelled zone-a** — 
2. **cache pods Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get nodes -L topology.kubernetes.io/zone`
2. `kubectl label node worker1 topology.kubernetes.io/zone=zone-a`
3. The affinity stays unchanged.
</details>

<details><summary>Task 2 hints</summary>

1. They schedule once a node matches.
2. `kubectl get pods -o wide`
3. All pods land on worker1.
</details>

<details><summary>Solution</summary>

```bash
kubectl label node worker1 topology.kubernetes.io/zone=zone-a
kubectl get pods -n zone -o wide
```
</details>

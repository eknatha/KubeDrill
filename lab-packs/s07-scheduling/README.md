# Taints, tolerations and nodeSelector

**Track:** CKA · **Level:** Beginner · **Time:** 15 min · **Namespace:** `ml`

The `trainer` Deployment needs a GPU node (`accelerator=gpu`). `worker1` is the GPU box but nobody labelled it, and it is tainted `dedicated=ml:NoSchedule` so only ML workloads may land there.

## Tasks

1. **Label worker1 with accelerator=gpu** — 
2. **Add a toleration for dedicated=ml:NoSchedule to the Deployment** — Do not remove the taint from the node.
3. **Both replicas Ready (on worker1)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl label node worker1 accelerator=gpu`
2. `kubectl get nodes --show-labels`
3. The pods now fail on the taint instead.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl describe pod` → "had untolerated taint {dedicated: ml}".
2. `kubectl patch deployment trainer --patch-file` is awkward; use `kubectl patch deployment trainer -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"dedicated","operator":"Equal","value":"ml","effect":"NoSchedule"}]}}}}'`
3. `kubectl edit deployment trainer` also works.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get pods -o wide`
2. Both pods should show NODE worker1.
3. Wait for the rollout.
</details>

<details><summary>Solution</summary>

```bash
kubectl label node worker1 accelerator=gpu
kubectl patch deployment trainer -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"dedicated","operator":"Equal","value":"ml","effect":"NoSchedule"}]}}}}'
kubectl get pods -o wide
```
</details>

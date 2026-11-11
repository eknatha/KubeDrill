# LoadBalancer stuck on <pending>

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 8 min · **Namespace:** `shop`

Service `web` is `type: LoadBalancer` but `EXTERNAL-IP` says `<pending>` forever — this cluster has no cloud load-balancer controller. Make the app reachable from outside the cluster another way.

## Tasks

1. **Understand why it is pending** — 
2. **Expose it with a NodePort Service** — 
3. **Endpoints still healthy** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get svc web -n shop`
2. No cloud-controller-manager / MetalLB here.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl patch svc web -n shop -p '{"spec":{"type":"NodePort"}}'`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get endpoints web -n shop`
</details>

<details><summary>Solution</summary>

```bash
kubectl get svc web -n shop
kubectl patch svc web -n shop -p '{"spec":{"type":"NodePort"}}'
kubectl get endpoints web -n shop
```
</details>

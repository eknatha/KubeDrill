# Nothing resolves: CoreDNS scaled to zero

**Track:** CKA · **Level:** Intermediate · **Time:** 8 min · **Namespace:** `shop`

After a "cost-saving" change, `client` can no longer reach `server` by name (`bad address`). IP traffic works. Find the DNS component and restore it.

## Tasks

1. **Find why names do not resolve** — 
2. **Restore CoreDNS to 2 replicas** — 
3. **client reaches server by name** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n kube-system`
2. `kubectl get endpoints kube-dns -n kube-system`
3. The kube-dns Service has no endpoints.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl scale deploy coredns -n kube-system --replicas=2`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl exec client -n shop -- wget -qO- server`
</details>

<details><summary>Solution</summary>

```bash
kubectl get endpoints kube-dns -n kube-system
kubectl scale deploy coredns -n kube-system --replicas=2
kubectl exec client -n shop -- wget -qO- server
```
</details>

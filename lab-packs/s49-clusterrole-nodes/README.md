# ClusterRole: let a ServiceAccount list nodes

**Track:** CKA, CKS · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `obs`

ServiceAccount `monitor` (namespace `obs`) must be able to `get` and `list` nodes — a cluster-scoped resource — but nothing else (no delete, no secrets). A namespaced Role cannot do this.

## Tasks

1. **ClusterRole `node-reader` (get,list nodes)** — 
2. **Bind it to the ServiceAccount cluster-wide** — 
3. **Least privilege: no delete on nodes** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create clusterrole --help`
2. `kubectl create clusterrole node-reader --verb=get,list --resource=nodes`
3. Nodes are cluster-scoped, so a ClusterRole is required.
</details>

<details><summary>Task 2 hints</summary>

1. A ClusterRoleBinding grants cluster-wide.
2. `kubectl create clusterrolebinding monitor-nodes --clusterrole=node-reader --serviceaccount=obs:monitor`
3. Verify: `kubectl auth can-i list nodes --as=system:serviceaccount:obs:monitor`
</details>

<details><summary>Task 3 hints</summary>

1. Only get,list were granted.
2. `kubectl auth can-i delete nodes --as=system:serviceaccount:obs:monitor`
3. Never use `*`.
</details>

<details><summary>Solution</summary>

```bash
kubectl create clusterrole node-reader --verb=get,list --resource=nodes
kubectl create clusterrolebinding monitor-nodes --clusterrole=node-reader --serviceaccount=obs:monitor
kubectl auth can-i list nodes --as=system:serviceaccount:obs:monitor
```
</details>

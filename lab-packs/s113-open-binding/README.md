# Hardening: an over-broad binding and the default ServiceAccount

**Track:** CKS · **Level:** Advanced · **Time:** 14 min · **Namespace:** `team`

A ClusterRoleBinding `everyone-admin` gives **cluster-admin** to the group `system:authenticated`, so every logged-in identity is an administrator. Remove it. Also, the `default` ServiceAccount in `team` should not auto-mount API tokens into pods: disable that, but keep the ServiceAccount.

## Tasks

1. **`everyone-admin` is gone** — 
2. **Default ServiceAccount no longer auto-mounts a token** — 
3. **The default ServiceAccount still exists** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get clusterrolebindings | grep cluster-admin`
2. `kubectl delete clusterrolebinding everyone-admin`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl patch sa default -n team -p '{"automountServiceAccountToken":false}'`
</details>

<details><summary>Task 3 hints</summary>

1. Do not delete it: Kubernetes would just recreate it.
</details>

<details><summary>Solution</summary>

```bash
kubectl delete clusterrolebinding everyone-admin
kubectl patch sa default -n team -p '{"automountServiceAccountToken":false}'
kubectl get sa default -n team -o yaml
```
</details>

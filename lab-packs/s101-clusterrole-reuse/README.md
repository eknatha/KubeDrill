# RBAC: one ClusterRole, bound per namespace

**Track:** CKA, CKS · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `dev`

ServiceAccount `ci` (namespace `dev`) must read pods in `dev` and `qa` — but not in `prod`. Create ONE ClusterRole `pod-viewer` (get, list, watch pods) and bind it with a RoleBinding in each allowed namespace. A ClusterRoleBinding would be too broad.

## Tasks

1. **ClusterRole `pod-viewer` exists** — 
2. **`ci` can list pods in dev and qa** — 
3. **`ci` cannot list pods in prod, and cannot delete anywhere** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create clusterrole pod-viewer --verb=get,list,watch --resource=pods`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl create rolebinding ci-view --clusterrole=pod-viewer --serviceaccount=dev:ci -n dev`
2. Repeat with `-n qa`.
</details>

<details><summary>Task 3 hints</summary>

1. Do not create a ClusterRoleBinding.
</details>

<details><summary>Solution</summary>

```bash
kubectl create clusterrole pod-viewer --verb=get,list,watch --resource=pods
kubectl create rolebinding ci-view --clusterrole=pod-viewer --serviceaccount=dev:ci -n dev
kubectl create rolebinding ci-view --clusterrole=pod-viewer --serviceaccount=dev:ci -n qa
kubectl auth can-i list pods -n prod --as=system:serviceaccount:dev:ci
```
</details>

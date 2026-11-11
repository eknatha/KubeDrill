# Cut a wildcard Role down to least privilege

**Track:** CKS, CKA · **Level:** Advanced · **Time:** 10 min · **Namespace:** `ci`

The CI ServiceAccount `deployer` in `ci` was given a Role with `*` on `*`. It only needs to manage Deployments. Replace the Role with the minimum rules — do not delete the RoleBinding.

## Tasks

1. **Deployer can still manage Deployments** — 
2. **…but cannot read Secrets** — 
3. **…and cannot delete Deployments** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl auth can-i create deployments --as=system:serviceaccount:ci:deployer -n ci`
2. Recreate the Role with verbs get,list,watch,create,update,patch on deployments.apps.
3. `kubectl delete role deployer -n ci` then `kubectl create role deployer --verb=get,list,watch,create,update,patch --resource=deployments.apps -n ci`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl auth can-i get secrets --as=system:serviceaccount:ci:deployer -n ci`
</details>

<details><summary>Task 3 hints</summary>

1. The pipeline only deploys; removal is a human action.
</details>

<details><summary>Solution</summary>

```bash
kubectl auth can-i get secrets --as=system:serviceaccount:ci:deployer -n ci
kubectl delete role deployer -n ci
kubectl create role deployer --verb=get,list,watch,create,update,patch --resource=deployments.apps -n ci
kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci
```
</details>

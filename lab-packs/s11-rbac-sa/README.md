# RBAC: least-privilege deployer

**Track:** CKA, CKS · **Level:** Intermediate · **Time:** 15 min · **Namespace:** `ci`

The CI system uses ServiceAccount `deployer` in namespace `ci`. It currently can do nothing. Give it exactly what it needs: get/list/create/update Deployments in `ci` — and nothing else (no deletes, no Secrets, no other namespaces).

## Tasks

1. **Create Role `deploy-manager` with get,list,create,update on deployments** — 
2. **Bind it to the ServiceAccount** — 
3. **Prove it is least-privilege** — deployer must NOT delete deployments or read secrets.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create role --help`
2. `kubectl create role deploy-manager --verb=get,list,create,update --resource=deployments -n ci`
3. Deployments are in API group `apps`; the command infers it.
</details>

<details><summary>Task 2 hints</summary>

1. A RoleBinding links a Role to a subject.
2. `kubectl create rolebinding deployer-binding --role=deploy-manager --serviceaccount=ci:deployer -n ci`
3. Format is `<namespace>:<name>`.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci`
2. Do not use `*` verbs or resources.
3. If a check says yes unexpectedly, review the Role rules.
</details>

<details><summary>Solution</summary>

```bash
kubectl create role deploy-manager --verb=get,list,create,update --resource=deployments -n ci
kubectl create rolebinding deployer-binding --role=deploy-manager --serviceaccount=ci:deployer -n ci
kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci
```
</details>

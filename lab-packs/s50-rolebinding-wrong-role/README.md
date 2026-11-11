# RoleBinding points at the wrong Role

**Track:** CKA, CKS · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `team`

ServiceAccount `dev` is bound (RoleBinding `dev-bind`) to the read-only Role `viewer`, but it needs to create Deployments (Role `editor`). A binding's roleRef is immutable — recreate it. `dev` must still not read Secrets.

## Tasks

1. **Find what the binding references** — 
2. **dev can create deployments, not read secrets** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get rolebinding dev-bind -o yaml`
2. `kubectl auth can-i create deployments --as=system:serviceaccount:team:dev -n team` → no
3. roleRef.name is viewer.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl delete rolebinding dev-bind`
2. `kubectl create rolebinding dev-bind --role=editor --serviceaccount=team:dev`
3. roleRef cannot be patched.
</details>

<details><summary>Solution</summary>

```bash
kubectl delete rolebinding dev-bind -n team
kubectl create rolebinding dev-bind --role=editor --serviceaccount=team:dev -n team
kubectl auth can-i create deployments --as=system:serviceaccount:team:dev -n team
```
</details>

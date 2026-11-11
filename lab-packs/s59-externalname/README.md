# ExternalName Service for an outside database

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `ext`

Apps call `legacy-db` inside the cluster, but the database lives at `db.example.com`. `legacy-db` is currently a useless ClusterIP Service. Replace it with an ExternalName Service pointing at db.example.com.

## Tasks

1. **Remove the wrong Service** — 
2. **ExternalName → db.example.com** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get svc legacy-db -o yaml`
2. Changing the type in place is awkward; recreate it.
3. `kubectl delete svc legacy-db`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl create service externalname legacy-db --external-name db.example.com`
2. It returns a DNS CNAME, no proxying, no ports needed.
3. `kubectl get svc legacy-db`
</details>

<details><summary>Solution</summary>

```bash
kubectl delete svc legacy-db -n ext
kubectl create service externalname legacy-db --external-name db.example.com -n ext
kubectl get svc legacy-db -n ext
```
</details>

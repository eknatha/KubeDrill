# Ingress: host + path routing

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 15 min · **Namespace:** `shop`

Services `web` and `api` exist in `shop`. Create Ingress `shop` (class `nginx`) routing host `shop.local`: `/` → web:80 and `/api` → api:80.

## Tasks

1. **Ingress `shop` exists with host shop.local** — 
2. **Both backends referenced** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create ingress --help`
2. `kubectl create ingress shop --class=nginx --rule="shop.local/=web:80" --rule="shop.local/api=api:80"`
3. Mind the quotes around --rule.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get ingress shop -o yaml`
2. Each path has backend.service.name and port.number.
3. Prefix match with pathType Prefix.
</details>

<details><summary>Solution</summary>

```bash
kubectl create ingress shop --class=nginx --rule="shop.local/=web:80" --rule="shop.local/api=api:80" -n shop
kubectl get ingress -n shop
```
</details>

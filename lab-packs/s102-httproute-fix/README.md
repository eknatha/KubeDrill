# Gateway API: the route attaches to nothing

**Track:** CKA · **Level:** Advanced · **Time:** 14 min · **Namespace:** `gw2`

HTTPRoute `shop` should expose Service `shop` at `shop.local` through Gateway `public`, but it points at a Gateway that does not exist and at the wrong backend port. Repair the route (do not create a second Gateway).

## Tasks

1. **Route attaches to Gateway `public`** — 
2. **Backend port matches the Service (80)** — 
3. **Hostname and a single Gateway kept** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get gateway -n gw2`
2. `kubectl describe httproute shop -n gw2` — parentRef `public-gw` not found.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get svc shop -n gw2`
2. Service port is 80, not 8080.
</details>

<details><summary>Task 3 hints</summary>


</details>

<details><summary>Solution</summary>

```bash
kubectl patch httproute shop -n gw2 --type=json -p '[{"op":"replace","path":"/spec/parentRefs/0/name","value":"public"},{"op":"replace","path":"/spec/rules/0/backendRefs/0/port","value":80}]'
kubectl get httproute -n gw2
```
</details>

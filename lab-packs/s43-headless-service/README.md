# StatefulSet needs a headless Service

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `ss`

StatefulSet `store` declares `serviceName: store-hl` but that Service does not exist, so pods have no stable DNS names. Create a headless Service `store-hl` (clusterIP None) selecting app=store on port 80.

## Tasks

1. **Headless Service `store-hl`** — 
2. **Service selects both pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create service clusterip store-hl --clusterip=None --tcp=80:80` (selector needs fixing) — or a manifest.
2. spec.clusterIP: None, selector app: store, port 80
3. Apply with a heredoc.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get endpoints store-hl`
2. Selector must be app=store.
3. Two addresses expected.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: store-hl
  namespace: ss
spec:
  clusterIP: None
  selector:
    app: store
  ports:
  - port: 80
EOF
kubectl get endpoints store-hl -n ss
```
</details>

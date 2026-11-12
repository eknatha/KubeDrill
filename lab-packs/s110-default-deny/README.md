# Default-deny, then allow only what is needed

**Track:** CKS, CKA · **Level:** Advanced · **Time:** 16 min · **Namespace:** `zt`

Namespace `zt` is wide open. Apply a **default-deny** NetworkPolicy for all pods (ingress and egress), then allow only: pods labelled `role=frontend` may reach `db` on port 80, and `frontend` pods may send egress to `db`. Nothing else (the pod `intruder` must stay blocked).

## Tasks

1. **A default-deny policy exists (all pods)** — 
2. **`frontend` can reach `db`:80** — 
3. **`intruder` is still blocked** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `podSelector: {}` selects every pod.
2. policyTypes: [Ingress, Egress] with no rules denies everything.
</details>

<details><summary>Task 2 hints</summary>

1. Two rules: ingress on db from role=frontend, egress on frontend to app=db.
</details>

<details><summary>Task 3 hints</summary>

1. Do not delete the default-deny.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: zt
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-from-frontend
  namespace: zt
spec:
  podSelector:
    matchLabels:
      app: db
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - port: 80
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-to-db
  namespace: zt
spec:
  podSelector:
    matchLabels:
      role: frontend
  policyTypes: ["Egress"]
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: db
    ports:
    - port: 80
EOF
kubectl get networkpolicy -n zt
```
</details>

# NetworkPolicy: allow only a labelled namespace

**Track:** CKS, CKA · **Level:** Advanced · **Time:** 15 min · **Namespace:** `data`

Database Service `db` in namespace `data` is open to everyone. Only namespaces labelled `env=prod` may reach it (`web-ns` is prod, `other` is not). Create NetworkPolicy `db-from-prod` using a namespaceSelector.

## Tasks

1. **NetworkPolicy `db-from-prod` exists** — 
2. **web-ns tester can reach db** — 
3. **other tester is blocked** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get ns --show-labels`
2. podSelector app=db, policyTypes [Ingress]
3. from: namespaceSelector.matchLabels env: prod
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl exec -n web-ns tester -- wget -qO- -T 2 db.data`
2. Allowed because the namespace carries env=prod.
3. Check the label spelling.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl exec -n other tester -- wget -qO- -T 2 db.data` → timeout
2. namespaceSelector only admits env=prod.
3. Do not use an empty namespaceSelector (= all).
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-from-prod
  namespace: data
spec:
  podSelector:
    matchLabels:
      app: db
  policyTypes: [Ingress]
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          env: prod
    ports:
    - protocol: TCP
      port: 80
EOF
kubectl exec -n other tester -- wget -qO- -T 2 db.data
```
</details>

# NetworkPolicy: lock down the database

**Track:** CKA, CKS · **Level:** Intermediate · **Time:** 15 min · **Namespace:** `app`

Everything in namespace `app` can reach the `db` Service. Only pods labelled `role=frontend` should. The `frontend` pod must keep working; the `intruder` pod must be blocked.

## Tasks

1. **Verify the problem: intruder can reach db** — `kubectl exec intruder -- wget -qO- -T 2 db`
2. **Create NetworkPolicy `db-allow-frontend`** — Select app=db, allow ingress only from role=frontend on TCP 80.
3. **Intruder is blocked** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. Without any NetworkPolicy, everything is allowed.
2. Policies select pods with `podSelector` and are additive allow-lists.
3. Once a pod is selected by an ingress policy, only listed sources are allowed.
</details>

<details><summary>Task 2 hints</summary>

1. Use a heredoc with `kubectl apply -f - <<EOF`.
2. spec.podSelector.matchLabels: app: db; policyTypes: [Ingress]; ingress[0].from[0].podSelector.matchLabels: role: frontend
3. Do not forget `policyTypes: [Ingress]`.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl exec intruder -- wget -qO- -T 2 db` should time out.
2. Check labels with `kubectl get pods --show-labels`.
3. The policy must not match role=intruder.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-allow-frontend
  namespace: app
spec:
  podSelector:
    matchLabels:
      app: db
  policyTypes: [Ingress]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 80
EOF
kubectl exec -n app intruder -- wget -qO- -T 2 db
```
</details>

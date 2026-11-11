# NetworkPolicy egress: allow only the API

**Track:** CKS, CKA · **Level:** Advanced · **Time:** 15 min · **Namespace:** `eg`

Pod `client` (role=client) has a default-deny egress policy, so it cannot reach anything. It must reach Service `api` (app=api, port 80) but NOT Service `admin`. Add an egress allow policy named `client-to-api`.

## Tasks

1. **Confirm client is isolated** — 
2. **client → api:80 allowed** — 
3. **client → admin:80 still blocked** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl exec client -- wget -qO- -T 2 api` → times out
2. `kubectl get networkpolicy`
3. An Egress policy with no rules blocks all outbound.
</details>

<details><summary>Task 2 hints</summary>

1. Create NetworkPolicy `client-to-api`: podSelector role=client, policyTypes [Egress].
2. egress[0].to[0].podSelector.matchLabels app: api; ports TCP 80
3. Policies are additive allow-lists.
</details>

<details><summary>Task 3 hints</summary>

1. Do not select app=admin.
2. `kubectl exec client -- wget -qO- -T 2 admin` should time out.
3. Never allow `to: []` (everything).
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: client-to-api
  namespace: eg
spec:
  podSelector:
    matchLabels:
      role: client
  policyTypes: [Egress]
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: api
    ports:
    - protocol: TCP
      port: 80
EOF
kubectl exec client -n eg -- wget -qO- -T 2 admin
```
</details>

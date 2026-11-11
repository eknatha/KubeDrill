# Service unreachable: climb the ladder

**Track:** CKA, CKAD · **Level:** Advanced · **Time:** 15 min · **Namespace:** `store`

`tester` cannot reach Service `web` in `store`. There are **three** independent faults. Work up the ladder: pod → endpoints → Service → NetworkPolicy.

## Tasks

1. **Service selects the pods** — 
2. **Service targets the real container port** — 
3. **Allow the traffic, keep default-deny** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get endpoints web -n store` is empty.
2. Compare `kubectl get svc web -o yaml` selector with `kubectl get pods --show-labels`.
</details>

<details><summary>Task 2 hints</summary>

1. The container listens on 80.
2. `kubectl patch svc web -n store --type=json -p '[{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'`
</details>

<details><summary>Task 3 hints</summary>

1. Add an ingress policy for `app=web` from pods labelled `run=tester`.
2. Do NOT delete `default-deny`.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch svc web -n store --type=json -p '[{"op":"replace","path":"/spec/selector/app","value":"web"},{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-tester
  namespace: store
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          run: tester
EOF
kubectl exec tester -n store -- wget -qO- web
```
</details>

# Service reachable but requests fail: wrong targetPort

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `route`

Service `api` has endpoints, yet `tester` cannot reach it on port 80. The nginx containers listen on 80 but the Service forwards to 8080.

## Tasks

1. **Find the wrong port** — 
2. **tester → api:80 works** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get svc api -o yaml`
2. Compare `targetPort` with the containerPort/listening port (80).
3. Test: `kubectl exec tester -- wget -qO- -T 2 api`
</details>

<details><summary>Task 2 hints</summary>

1. Fix targetPort to 80.
2. `kubectl apply` a corrected Service manifest.
3. Endpoints will show :80.
</details>

<details><summary>Solution</summary>

```bash
kubectl get svc api -o yaml
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: route
spec:
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 80
EOF
kubectl exec tester -- wget -qO- -T 2 api
```
</details>

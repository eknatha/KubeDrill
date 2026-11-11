# Onboard a tenant namespace

**Track:** CKA, CKS · **Level:** Advanced · **Time:** 20 min · **Namespace:** `team-b`

Create a safe namespace `team-b`: ResourceQuota (max 5 pods), a LimitRange giving default CPU limit 200m, and a default-deny ingress NetworkPolicy. Prove it by running a pod that automatically receives the default limit.

## Tasks

1. **Namespace `team-b` with ResourceQuota `team-quota` (pods: 5)** — 
2. **LimitRange `defaults` with default cpu limit 200m** — 
3. **NetworkPolicy `default-deny` (ingress) selecting all pods** — 
4. **Run pod `probe` and see the default limit applied** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create namespace team-b`
2. `kubectl create quota team-quota --hard=pods=5 -n team-b`
3. 
</details>

<details><summary>Task 2 hints</summary>

1. kind LimitRange, spec.limits[0].type: Container
2. spec.limits[0].default.cpu: 200m
3. Apply with a heredoc in -n team-b.
</details>

<details><summary>Task 3 hints</summary>

1. podSelector: {} selects every pod.
2. policyTypes: [Ingress] with no ingress rules = deny all.
3. Name it default-deny.
</details>

<details><summary>Task 4 hints</summary>

1. `kubectl run probe --image=nginx:1.25 -n team-b`
2. `kubectl get pod probe -n team-b -o jsonpath='{.spec.containers[0].resources.limits.cpu}'`
3. The LimitRange must exist before the pod is created.
</details>

<details><summary>Solution</summary>

```bash
kubectl create namespace team-b
kubectl create quota team-quota --hard=pods=5 -n team-b
kubectl apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: team-b
spec:
  limits:
  - type: Container
    default:
      cpu: 200m
    defaultRequest:
      cpu: 100m
EOF
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: team-b
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF
kubectl run probe --image=nginx:1.25 -n team-b
```
</details>

# Every node is tainted — add a toleration

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `dedic`

Both workers carry the taint `team=data:NoSchedule`. Deployment `etl` cannot schedule. Add a matching toleration to the Deployment (do not remove the taints).

## Tasks

1. **Deployment tolerates team=data:NoSchedule** — 
2. **2 pods Ready; taints untouched** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod` → untolerated taint {team: data}
2. Toleration: key team, operator Equal, value data, effect NoSchedule.
3. `kubectl patch deployment etl -p ...` under spec.template.spec.tolerations
</details>

<details><summary>Task 2 hints</summary>

1. Rollout restarts pods.
2. `kubectl get nodes -o jsonpath` shows taints
3. Do not run `kubectl taint ... -`.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment etl -n dedic -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"team","operator":"Equal","value":"data","effect":"NoSchedule"}]}}}}'
kubectl rollout status deployment/etl -n dedic
```
</details>

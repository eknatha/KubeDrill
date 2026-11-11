# Autoscale a Deployment with HPA

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `web`

Deployment `shop` has CPU requests set. Create a HorizontalPodAutoscaler named `shop` that keeps 2–6 replicas at 50% average CPU.

## Tasks

1. **Create the HPA** — 
2. **Deployment scaled up to the minimum** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl autoscale --help`
2. `kubectl autoscale deployment shop --min=2 --max=6 --cpu-percent=50`
3. HPA needs resource requests on the pods (already set).
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get hpa`
2. HPA raises replicas to at least minReplicas.
3. Wait a few seconds then `kubectl get deploy shop`.
</details>

<details><summary>Solution</summary>

```bash
kubectl autoscale deployment shop --min=2 --max=6 --cpu-percent=50
kubectl get hpa
```
</details>

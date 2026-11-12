# NoExecute taint: evict, but spare the critical pod

**Track:** CKA · **Level:** Advanced · **Time:** 14 min · **Namespace:** `edge`

worker2 is being retired. Taint it `retire=true:NoExecute` so running pods are evicted. The `payments` Deployment must keep running on worker2 for 5 more minutes: give it a toleration with `tolerationSeconds: 300`. Everything else should leave.

## Tasks

1. **`payments` tolerates the taint for 300 seconds** — 
2. **worker2 carries `retire=true:NoExecute`** — 
3. **Workloads still Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.tolerations.tolerationSeconds`
2. Toleration: key retire, operator Equal, value "true", effect NoExecute, tolerationSeconds 300.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl taint nodes worker2 retire=true:NoExecute`
</details>

<details><summary>Task 3 hints</summary>

1. Evicted pods move to worker1.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment payments -n edge -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"retire","operator":"Equal","value":"true","effect":"NoExecute","tolerationSeconds":300}]}}}}'
kubectl taint nodes worker2 retire=true:NoExecute
kubectl get pods -n edge -o wide
```
</details>

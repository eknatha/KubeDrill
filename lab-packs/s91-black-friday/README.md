# Incident: Black Friday checkout

**Track:** CKA, CKAD · **Level:** Advanced · **Time:** 20 min · **Namespace:** `shop`

Incident rules: stabilise first, then fix root causes, change one thing at a time, and write down what you changed. **02:47.** Traffic is 10× normal and checkout is down. Three things are wrong, in three layers: the image, the namespace budget, and the Service in front. Get a request from `tester` to `checkout` through.

## Tasks

1. **Image: pods start** — 
2. **Namespace budget: all 4 replicas can exist** — 
3. **Service: it finds the pods** — 
4. **End-to-end request works** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n shop`
2. Tag `1.255` does not exist.
3. `kubectl set image deploy/checkout app=nginx:1.25 -n shop`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl describe rs -n shop` shows `exceeded quota`.
2. `kubectl patch resourcequota shop-budget -n shop -p '{"spec":{"hard":{"pods":"8"}}}'`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get endpoints checkout -n shop` is empty.
2. The selector is `app=check` but pods are `app=checkout`.
</details>

<details><summary>Task 4 hints</summary>

1. `kubectl exec tester -n shop -- wget -qO- checkout`
</details>

<details><summary>Solution</summary>

```bash
kubectl set image deploy/checkout app=nginx:1.25 -n shop
kubectl patch resourcequota shop-budget -n shop -p '{"spec":{"hard":{"pods":"8"}}}'
kubectl patch svc checkout -n shop --type=json -p '[{"op":"replace","path":"/spec/selector/app","value":"checkout"}]'
kubectl exec tester -n shop -- wget -qO- checkout
```
</details>

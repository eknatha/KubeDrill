# Hunt the privileged workloads

**Track:** CKS · **Level:** Advanced · **Time:** 12 min · **Namespace:** `payments`

An audit found workloads in `payments` that can escape their container: one runs **privileged**, one shares the host **PID** namespace, one mounts the container runtime socket via **hostPath**. Remove each risk without taking the apps down.

## Tasks

1. **Stop ledger running privileged** — 
2. **Remove hostPID from reports** — 
3. **Remove the docker.sock hostPath from cache** — 
4. **Everything still running** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get deploy -n payments -o yaml | grep -n privileged`
2. JSON patch: `replace` the field with `false`.
3. `kubectl patch deploy ledger -n payments --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/securityContext/privileged","value":false}]'`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get deploy reports -n payments -o jsonpath={.spec.template.spec.hostPID}`
2. JSON patch `remove` on `/spec/template/spec/hostPID`.
</details>

<details><summary>Task 3 hints</summary>

1. Remove both the volume and its mount.
2. `--type=json` with two `remove` ops (mount first, then volume).
3. Paths: `/spec/template/spec/containers/0/volumeMounts` and `/spec/template/spec/volumes`.
</details>

<details><summary>Task 4 hints</summary>

1. `kubectl get pods -n payments`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deploy ledger -n payments --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/securityContext/privileged","value":false}]'
kubectl patch deploy reports -n payments --type=json -p '[{"op":"remove","path":"/spec/template/spec/hostPID"}]'
kubectl patch deploy cache -n payments --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/0/volumeMounts"},{"op":"remove","path":"/spec/template/spec/volumes"}]'
kubectl get pods -n payments
```
</details>

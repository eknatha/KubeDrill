# Expose a Service on a fixed NodePort

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `np`

Service `site` is ClusterIP. Make it a NodePort reachable on port 30080 (port 80 → targetPort 80).

## Tasks

1. **Service type NodePort** — 
2. **nodePort is exactly 30080** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get svc site`
2. `kubectl patch svc site -p '{"spec":{"type":"NodePort"}}'`
3. Or edit/apply a full manifest.
</details>

<details><summary>Task 2 hints</summary>

1. Range is 30000–32767.
2. ports: [{port: 80, targetPort: 80, nodePort: 30080}]
3. `kubectl get svc site` → 80:30080/TCP
</details>

<details><summary>Solution</summary>

```bash
kubectl patch svc site -n np -p '{"spec":{"type":"NodePort","ports":[{"port":80,"targetPort":80,"nodePort":30080}]}}'
kubectl get svc site -n np
```
</details>

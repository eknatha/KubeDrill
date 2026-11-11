# Multi-container pod: log sidecar

**Track:** CKAD · **Level:** Beginner · **Time:** 15 min · **Namespace:** `logs`

The `webapp` pod only runs nginx. Rebuild it with a second container `log-agent` (busybox:1.36) that runs `tail -f /var/log/nginx/access.log`. Both containers share an emptyDir volume named `logs` mounted at /var/log/nginx. Pods are immutable — delete and recreate.

## Tasks

1. **Pod `webapp` has containers `webapp` and `log-agent`** — 
2. **Shared emptyDir volume `logs` mounted in both containers** — 
3. **Pod Ready (2/2)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pod webapp -o yaml > webapp.yaml`, edit, `kubectl delete pod webapp`, `kubectl apply -f webapp.yaml`.
2. Or write the manifest from scratch with a heredoc.
3. Use `command: ["sh","-c","tail -f /var/log/nginx/access.log"]` for the sidecar.
</details>

<details><summary>Task 2 hints</summary>

1. `volumes: [{name: logs, emptyDir: {}}]`
2. Add `volumeMounts: [{name: logs, mountPath: /var/log/nginx}]` to BOTH containers.
3. Check `kubectl describe pod webapp | grep -A4 Mounts`.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get pod webapp` → READY 2/2
2. Logs: `kubectl logs webapp -c log-agent`
</details>

<details><summary>Solution</summary>

```bash
kubectl delete pod webapp --force
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  volumes:
  - name: logs
    emptyDir: {}
  containers:
  - name: webapp
    image: nginx:1.25
    volumeMounts:
    - {name: logs, mountPath: /var/log/nginx}
  - name: log-agent
    image: busybox:1.36
    command: ["sh","-c","tail -f /var/log/nginx/access.log"]
    volumeMounts:
    - {name: logs, mountPath: /var/log/nginx}
EOF
```
</details>

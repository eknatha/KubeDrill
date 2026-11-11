# Mount a ConfigMap as a file

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `files`

Pod `web` must see `/etc/app/app.properties` from ConfigMap `app-props` (key `app.properties`, content `mode=prod`). Create the ConfigMap, then recreate the pod with the volume mount.

## Tasks

1. **ConfigMap `app-props` with key app.properties** — 
2. **Pod `web` mounts it at /etc/app** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create configmap app-props --from-literal=app.properties=mode=prod`
2. Use `--from-file` for real files.
3. `kubectl get cm app-props -o yaml`
</details>

<details><summary>Task 2 hints</summary>

1. Pods are immutable — delete and recreate.
2. volumes: [{name: cfg, configMap: {name: app-props}}]; volumeMounts: [{name: cfg, mountPath: /etc/app}]
3. `kubectl delete pod web --force` first.
</details>

<details><summary>Solution</summary>

```bash
kubectl create configmap app-props --from-literal=app.properties=mode=prod -n files
kubectl delete pod web --force
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: files
  labels:
    app: web
spec:
  containers:
  - name: web
    image: nginx:1.25
    volumeMounts:
    - {name: cfg, mountPath: /etc/app}
  volumes:
  - name: cfg
    configMap:
      name: app-props
EOF
```
</details>

# Inject config: envFrom and a read-only Secret volume

**Track:** CKAD · **Level:** Intermediate · **Time:** 14 min · **Namespace:** `cfg`

Deployment `web` must load **all keys** of ConfigMap `app-config` as environment variables, and mount Secret `app-creds` as read-only files at `/etc/creds` (not as env vars). Both objects exist.

## Tasks

1. **All ConfigMap keys become env vars (envFrom)** — 
2. **Secret mounted read-only at /etc/creds** — 
3. **Pods Ready, secret not in env** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.containers.envFrom`
2. envFrom: [{configMapRef: {name: app-config}}]
</details>

<details><summary>Task 2 hints</summary>

1. Add a `volumes` entry with `secret.secretName: app-creds`.
2. volumeMounts: mountPath /etc/creds, readOnly: true
</details>

<details><summary>Task 3 hints</summary>


</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment web -n cfg --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/envFrom","value":[{"configMapRef":{"name":"app-config"}}]},{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"creds","secret":{"secretName":"app-creds"}}]},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"creds","mountPath":"/etc/creds","readOnly":true}]}]'
kubectl rollout status deployment/web -n cfg
```
</details>

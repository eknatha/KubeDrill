# ImagePullBackOff from a private registry

**Track:** CKAD, CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `priv`

Deployment `billing` uses `private.registry.io/billing:1.0` and fails with an authorization error. Create a docker-registry Secret `regcred` and reference it from the Deployment.

## Tasks

1. **Secret `regcred` (docker-registry) exists** — 
2. **Deployment uses it and pods are Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod` → no basic auth credentials
2. `kubectl create secret docker-registry regcred --docker-server=private.registry.io --docker-username=ci --docker-password=s3cret`
3. Namespace `priv`.
</details>

<details><summary>Task 2 hints</summary>

1. spec.template.spec.imagePullSecrets: [{name: regcred}]
2. `kubectl patch deployment billing -p ...`
3. `kubectl rollout status deployment/billing`
</details>

<details><summary>Solution</summary>

```bash
kubectl create secret docker-registry regcred --docker-server=private.registry.io --docker-username=ci --docker-password=s3cret -n priv
kubectl patch deployment billing -n priv -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"regcred"}]}}}}'
kubectl rollout status deployment/billing -n priv
```
</details>

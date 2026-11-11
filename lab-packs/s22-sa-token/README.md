# Harden ServiceAccount token mounting

**Track:** CKS · **Level:** Advanced · **Time:** 15 min · **Namespace:** `hardening`

Deployment `web` runs as the `default` ServiceAccount with an auto-mounted API token — it never talks to the API. Create ServiceAccount `web-sa` with token automount disabled and run the Deployment as it, also disabling automount on the pod spec.

## Tasks

1. **ServiceAccount `web-sa` with automountServiceAccountToken: false** — 
2. **Deployment uses web-sa and automount false** — 
3. **Pods Ready after the change** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create serviceaccount web-sa`
2. Then `kubectl patch sa web-sa -p '{"automountServiceAccountToken":false}'`
3. Or apply a manifest.
</details>

<details><summary>Task 2 hints</summary>

1. Patch spec.template.spec.
2. Fields: `serviceAccountName: web-sa`, `automountServiceAccountToken: false`.
3. `kubectl patch deployment web -p ...`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl rollout status deployment/web`
2. `kubectl get pods`
3. Old pods are replaced.
</details>

<details><summary>Solution</summary>

```bash
kubectl create serviceaccount web-sa
kubectl patch sa web-sa -p '{"automountServiceAccountToken":false}'
kubectl patch deployment web -p '{"spec":{"template":{"spec":{"serviceAccountName":"web-sa","automountServiceAccountToken":false}}}}'
kubectl rollout status deployment/web
```
</details>

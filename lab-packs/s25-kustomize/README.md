# Kustomize: base + prod overlay

**Track:** CKAD · **Level:** Advanced · **Time:** 15 min · **Namespace:** `shop`

A `base/` with a Deployment `web` exists in your working directory. Create `overlays/prod/` that reuses the base, prefixes names with `prod-`, runs 3 replicas, and deploy it with `kubectl apply -k`.

## Tasks

1. **Create overlays/prod/kustomization.yaml** — 
2. **Apply the overlay: prod-web with 3 Ready replicas** — `kubectl apply -k overlays/prod`

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `mkdir -p overlays/prod`
2. resources: [../../base]
3. namePrefix: prod-, namespace: shop, replicas: [{name: web, count: 3}]
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl kustomize overlays/prod` previews the output.
2. `kubectl apply -k overlays/prod`
3. `kubectl get deploy -n shop`
</details>

<details><summary>Solution</summary>

```bash
mkdir -p overlays/prod
cat > overlays/prod/kustomization.yaml <<EOF
resources:
- ../../base
namePrefix: prod-
namespace: shop
replicas:
- name: web
  count: 3
EOF
kubectl kustomize overlays/prod
kubectl apply -k overlays/prod
```
</details>

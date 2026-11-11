# Kustomize: override the image tag

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `img`

The `base/` Deployment `web` uses `nginx:1.24`. Create `overlays/prod/` that keeps the base but sets the image tag to `1.25` using the kustomize `images:` transformer, then deploy it into namespace `img`.

## Tasks

1. **overlays/prod/kustomization.yaml uses `images`** — 
2. **Deployed: web runs nginx:1.25** — 

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
2. resources: [../../base]; namespace: img
3. images: [{name: nginx, newTag: "1.25"}]
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl kustomize overlays/prod` to preview.
2. `kubectl apply -k overlays/prod`
3. `kubectl get deploy web -n img -o wide`
</details>

<details><summary>Solution</summary>

```bash
mkdir -p overlays/prod
cat > overlays/prod/kustomization.yaml <<EOF
resources:
- ../../base
namespace: img
images:
- name: nginx
  newTag: "1.25"
EOF
kubectl kustomize overlays/prod
kubectl apply -k overlays/prod
```
</details>

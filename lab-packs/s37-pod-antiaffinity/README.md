# Spread replicas with pod anti-affinity

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 15 min · **Namespace:** `spread`

Deployment `front` (2 replicas) may land both pods on one node. Add REQUIRED pod anti-affinity on `kubernetes.io/hostname` so replicas never share a node.

## Tasks

1. **Anti-affinity added** — 
2. **2 Ready replicas on different nodes** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.affinity.podAntiAffinity`
2. requiredDuringSchedulingIgnoredDuringExecution → labelSelector app=front, topologyKey kubernetes.io/hostname
3. Apply the full Deployment with a heredoc.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pods -o wide` → different NODE values.
2. Two workers are available.
3. A third replica would stay Pending.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: front
  namespace: spread
spec:
  replicas: 2
  selector:
    matchLabels:
      app: front
  template:
    metadata:
      labels:
        app: front
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                app: front
      containers:
      - name: front
        image: nginx:1.25
EOF
kubectl get pods -n spread -o wide
```
</details>

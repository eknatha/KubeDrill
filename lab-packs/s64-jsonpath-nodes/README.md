# JSONPath: extract node names and images

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `jp`

Exam-style extraction. Save all node names (space-separated) to `nodes.txt`, and the container images of every pod in namespace `jp` to `images.txt`, using `-o jsonpath`.

## Tasks

1. **nodes.txt contains the node names** — 
2. **images.txt contains the pod images** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get nodes -o jsonpath='{.items[*].metadata.name}' > nodes.txt`
2. `cat nodes.txt`
3. Quote the JSONPath expression.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pods -n jp -o jsonpath='{.items[*].spec.containers[*].image}' > images.txt`
2. Or use `range` for one per line.
3. `cat images.txt`
</details>

<details><summary>Solution</summary>

```bash
kubectl get nodes -o jsonpath='{.items[*].metadata.name}' > nodes.txt
kubectl get pods -n jp -o jsonpath='{.items[*].spec.containers[*].image}' > images.txt
cat nodes.txt
```
</details>

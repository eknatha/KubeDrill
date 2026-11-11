# custom-columns and --sort-by

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `cc`

Write `pods.txt` with a table of pod name and node (columns `NAME` and `NODE`) for namespace `cc`, and `sorted.txt` with pod names sorted by creation time (`-o name`).

## Tasks

1. **pods.txt has NAME and NODE columns** — 
2. **sorted.txt sorted by creation time** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n cc -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName > pods.txt`
2. custom-columns=HEADER:.json.path,...
3. `cat pods.txt`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pods -n cc --sort-by=.metadata.creationTimestamp -o name > sorted.txt`
2. --sort-by takes a JSONPath without braces.
3. `cat sorted.txt`
</details>

<details><summary>Solution</summary>

```bash
kubectl get pods -n cc -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName > pods.txt
kubectl get pods -n cc --sort-by=.metadata.creationTimestamp -o name > sorted.txt
cat pods.txt
```
</details>

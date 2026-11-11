# Extend Kubernetes: CRD + custom resource

**Track:** CKA, CKAD · **Level:** Advanced · **Time:** 15 min · **Namespace:** `ops`

Define a new API type `Backup` (group `stable.example.com`, namespaced, plural `backups`) with a `schedule` string field, then create a Backup named `nightly` in namespace `ops`.

## Tasks

1. **Create CRD `backups.stable.example.com`** — 
2. **Create Backup `nightly`** — spec.schedule: "0 2 * * *"

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. apiVersion apiextensions.k8s.io/v1, kind CustomResourceDefinition.
2. name must be `<plural>.<group>`; scope Namespaced; names.kind Backup, plural backups.
3. versions: [{name: v1, served: true, storage: true, schema.openAPIV3Schema ...}]
</details>

<details><summary>Task 2 hints</summary>

1. apiVersion stable.example.com/v1, kind Backup.
2. `kubectl get backups -n ops` after creating.
3. Created CRs are validated by the CRD schema.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: backups.stable.example.com
spec:
  group: stable.example.com
  scope: Namespaced
  names:
    kind: Backup
    plural: backups
    singular: backup
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              schedule:
                type: string
EOF
kubectl apply -f - <<EOF
apiVersion: stable.example.com/v1
kind: Backup
metadata:
  name: nightly
  namespace: ops
spec:
  schedule: "0 2 * * *"
EOF
kubectl get backups -n ops
```
</details>

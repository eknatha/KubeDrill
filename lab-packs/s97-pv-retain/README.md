# Storage: keep the data, allow expansion

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `store`

The `reports` volume holds quarterly data. Its PersistentVolume would be wiped when the claim is deleted, and the StorageClass cannot grow volumes. Make the data survive claim deletion and let the class expand volumes, then grow the claim to 2Gi.

## Tasks

1. **PV `pv-reports` keeps data after the claim is deleted** — 
2. **StorageClass `fast` allows volume expansion** — 
3. **Claim `reports` requests 2Gi** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pv` shows RECLAIM POLICY Delete.
2. `kubectl patch pv pv-reports -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl explain storageclass.allowVolumeExpansion`
2. `kubectl patch sc fast -p '{"allowVolumeExpansion":true}'`
</details>

<details><summary>Task 3 hints</summary>

1. Expansion only works once the class allows it.
2. `kubectl patch pvc reports -n store -p '{"spec":{"resources":{"requests":{"storage":"2Gi"}}}}'`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch pv pv-reports -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
kubectl patch sc fast -p '{"allowVolumeExpansion":true}'
kubectl patch pvc reports -n store -p '{"spec":{"resources":{"requests":{"storage":"2Gi"}}}}'
kubectl get pv,pvc -A
```
</details>

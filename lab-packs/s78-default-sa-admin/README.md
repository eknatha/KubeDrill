# The default ServiceAccount is cluster-admin

**Track:** CKS, CKA · **Level:** Advanced · **Time:** 10 min · **Namespace:** `apps`

Someone bound `cluster-admin` to the **default** ServiceAccount in `apps` "to make the dashboard work". Every pod in the namespace can now do anything. Remove the binding and give the dashboard its own ServiceAccount that can only read pods in `apps`.

## Tasks

1. **Default SA is no longer privileged** — 
2. **Dedicated SA `dash-reader` can read pods in apps** — 
3. **Dashboard uses its own SA** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl auth can-i list secrets --as=system:serviceaccount:apps:default -A`
2. `kubectl delete clusterrolebinding default-sa-admin`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl create sa dash-reader -n apps`
2. `kubectl create role pod-reader --verb=get,list,watch --resource=pods -n apps`
3. `kubectl create rolebinding dash-reader --role=pod-reader --serviceaccount=apps:dash-reader -n apps`
</details>

<details><summary>Task 3 hints</summary>

1. JSON patch `add` at `/spec/template/spec/serviceAccountName`.
</details>

<details><summary>Solution</summary>

```bash
kubectl delete clusterrolebinding default-sa-admin
kubectl create sa dash-reader -n apps
kubectl create role pod-reader --verb=get,list,watch --resource=pods -n apps
kubectl create rolebinding dash-reader --role=pod-reader --serviceaccount=apps:dash-reader -n apps
kubectl patch deploy dash -n apps --type=json -p '[{"op":"add","path":"/spec/template/spec/serviceAccountName","value":"dash-reader"}]'
kubectl get pods -n apps
```
</details>

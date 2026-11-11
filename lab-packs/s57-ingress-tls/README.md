# Ingress with TLS termination

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 15 min · **Namespace:** `sec`

Service `web` is exposed by Ingress `web` over plain HTTP. Terminate TLS for host `secure.local` using a TLS Secret `web-tls` (create it from the provided `tls.crt` and `tls.key`) and reference it in the Ingress.

## Tasks

1. **TLS Secret `web-tls` exists** — 
2. **Ingress references the secret for secure.local** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl create secret tls --help`
2. `kubectl create secret tls web-tls --cert=tls.crt --key=tls.key -n sec`
3. Type must be kubernetes.io/tls.
</details>

<details><summary>Task 2 hints</summary>

1. spec.tls: [{hosts: [secure.local], secretName: web-tls}]
2. `kubectl edit ingress web` or re-apply the manifest.
3. `kubectl describe ingress web`
</details>

<details><summary>Solution</summary>

```bash
kubectl create secret tls web-tls --cert=tls.crt --key=tls.key -n sec
kubectl patch ingress web -n sec -p '{"spec":{"tls":[{"hosts":["secure.local"],"secretName":"web-tls"}]}}'
kubectl describe ingress web -n sec
```
</details>

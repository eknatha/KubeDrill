# Gateway API: Gateway + HTTPRoute

**Track:** CKA · **Level:** Advanced · **Time:** 15 min · **Namespace:** `gw`

The successor to Ingress. Expose Service `web` through a Gateway `public` (class `nginx`, HTTP listener on 80) and an HTTPRoute `web-route` for host `app.local`.

## Tasks

1. **Create Gateway `public`** — gatewayClassName nginx, listener `http` port 80 protocol HTTP.
2. **Create HTTPRoute `web-route`** — parentRef public, hostname app.local, backend web:80.

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get gatewayclass`
2. apiVersion gateway.networking.k8s.io/v1, kind Gateway.
3. spec.listeners: [{name: http, port: 80, protocol: HTTP}]
</details>

<details><summary>Task 2 hints</summary>

1. kind HTTPRoute, same apiVersion.
2. spec.parentRefs: [{name: public}]; spec.hostnames: [app.local]
3. spec.rules[0].backendRefs: [{name: web, port: 80}]
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public
  namespace: gw
spec:
  gatewayClassName: nginx
  listeners:
  - name: http
    port: 80
    protocol: HTTP
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-route
  namespace: gw
spec:
  parentRefs:
  - name: public
  hostnames: ["app.local"]
  rules:
  - backendRefs:
    - name: web
      port: 80
EOF
kubectl get gateway,httproute -n gw
```
</details>

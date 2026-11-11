# Back up etcd with a snapshot

**Track:** CKA · **Level:** Advanced · **Time:** 10 min · **Namespace:** `kube-system`

Before upgrading the control plane, take an etcd snapshot to `/home/student/etcd-backup.db` and verify it. (The simulator supports `etcdctl snapshot save|status`; on a real cluster add the --endpoints/--cacert/--cert/--key flags.)

## Tasks

1. **Snapshot saved** — 
2. **Snapshot verified** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `etcdctl snapshot save /home/student/etcd-backup.db`
2. Real clusters: `ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 --cacert=... --cert=... --key=... snapshot save <file>`
3. Certificates live in /etc/kubernetes/pki/etcd.
</details>

<details><summary>Task 2 hints</summary>

1. `etcdctl snapshot status /home/student/etcd-backup.db`
2. It prints hash, revision, total keys and size.
3. Always verify a backup before relying on it.
</details>

<details><summary>Solution</summary>

```bash
etcdctl snapshot save /home/student/etcd-backup.db
etcdctl snapshot status /home/student/etcd-backup.db
```
</details>

# Read the audit log: who touched the secret?

**Track:** CKS · **Level:** Advanced · **Time:** 14 min · **Namespace:** `audit`

Something read the Secret `prod-db` last night. The API server audit log is at `/home/student/audit.log` (one event per line: `user=… verb=… resource=… name=… code=…`). Find the user who **successfully** (code 200) read that Secret and write `user=<name>` to `/home/student/answer.txt`. Then count the denied requests (code 403) and write the number to `/home/student/denied.txt`.

## Tasks

1. **answer.txt names the user who read `prod-db` successfully** — 
2. **denied.txt holds the number of 403 events** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `grep prod-db /home/student/audit.log`
2. Then keep only `code=200`: `grep code=200`.
3. Print the first field with `awk '{print $1}'` and redirect with `>`.
</details>

<details><summary>Task 2 hints</summary>

1. `grep -c code=403 /home/student/audit.log > /home/student/denied.txt`
</details>

<details><summary>Solution</summary>

```bash
grep prod-db /home/student/audit.log | grep code=200 | awk '{print $1}' > /home/student/answer.txt
grep -c code=403 /home/student/audit.log > /home/student/denied.txt
cat /home/student/answer.txt /home/student/denied.txt
```
</details>

#!/usr/bin/env bash
# Run KubeDrill labs on a real local cluster (kind). Usage:
#   ./kubedrill.sh cluster          create a kind cluster "kubedrill" (1 control-plane + 2 workers)
#   ./kubedrill.sh list             list labs
#   ./kubedrill.sh setup  <lab-id>  break the environment
#   ./kubedrill.sh check  <lab-id>  run the checks
#   ./kubedrill.sh reset  <lab-id>  remove the lab namespace(s)
#   ./kubedrill.sh delete           delete the kind cluster
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case "${1:-}" in
  cluster)
    command -v kind >/dev/null || { echo "install kind first: https://kind.sigs.k8s.io"; exit 1; }
    printf "kind: Cluster\napiVersion: kind.x-k8s.io/v1alpha4\nnodes: [{role: control-plane}, {role: worker}, {role: worker}]\n" | kind create cluster --name kubedrill --config -
    echo "Note: nodes are named kubedrill-worker and kubedrill-worker2 (labs say worker1/worker2)." ;;
  list) ls -1 "$here" | grep -E '^s[0-9]+-' ;;
  setup|check|reset) [ -d "$here/${2:?lab id}" ] || { echo "unknown lab"; exit 1; }; bash "$here/$2/$1.sh" ;;
  delete) kind delete cluster --name kubedrill ;;
  *) sed -n '2,9p' "$0" ;;
esac

# KubeLab — free, offline Kubernetes practice

> **Live:** [kubelab.eknathalabs.com](https://kubelab.eknathalabs.com) · Free · No ads · No signup · No tracking · Works offline
> Part of [EknathaLabs](https://eknathalabs.com)

Practise Kubernetes the way the exams test it: break things, read events, fix them with `kubectl`. KubeLab runs a **deterministic kubectl simulator in your browser** with auto-checked labs, a timed exam mode and a spaced-repetition quiz — and every lab is also exported as bash scripts for a **real kind cluster**.

## What's inside

| | |
|---|---|
| **Predict first** | In Learn mode, fault labs ask you to commit to a root cause before you touch the terminal; the debrief tells you whether you were right and tracks your accuracy. |
| **Daily challenge** | One fault lab per day (by local date), a streak and a 14-day history. Works offline. |
| **Mock exam bundles** | Fixed CKA/CKAD/CKS sets with weighted tasks, flag-for-review, pass mark 66% and a score-by-domain report. |
| **Real exam environment** | Optional: no checker, no cluster panel, several kube contexts (each task starts in the wrong one, as on the real exam), submit to score. |
| **Real-world failure library** | 5 simulator-only labs (S69–S73): stuck finalizers, NotReady node, kubelet vs swap, a dead admission webhook, expired control-plane certificates. They use `ssh <node> '<cmd>'`, which exists only in the simulator, so they have no kind pack. |
| **Field Guide** | 3 fictional "3 a.m. page" story episodes (chained labs), 5 "Anatomy of an outage" explainers (Reddit 2023, Datadog 2023, OpenAI 2024, Monzo 2017, Zalando 2019: paraphrased from the cited post-mortems and linked to them), and 3 step-through concept animations. |
| **90-second onboarding** | First-run walkthrough with a real mini-terminal; replay from Field Guide. |
| **Workbench layouts** | Split, focus (press `F`) and stacked layouts, remembered per browser. |
| **Terminal that teaches** | Live explanation of the verb, flags and short names as you type, plus did-you-mean for mistyped resources and commands. |
| **Diagram upgrades** | Colour-blind-safe glyphs, per-workload colour stripe, NetworkPolicy shield badge, NotReady node styling. |
| **Docs peek** | Slide-in drawer with commands related to the lab and kubernetes.io pages (in real-exam mode, only kubernetes.io). |
| **Clickable diagram** | Click a pod, service or node to run `describe` in the terminal; hover a service to light up its endpoints. |
| **Learn / Exam modes** | Every lab runs in Learn mode (hints, solution, debrief) or Exam mode (no hints, countdown timer, scored result). |
| **Live cluster diagram** | Nodes and pods colour-coded by health, services with endpoint counts; animates as you fix things. Switch to the text view any time. |
| **Debrief card** | After each lab: root cause, the fix, how to spot it in production and the command pattern to remember. |
| **Interactive labs** | 96 broken-cluster scenarios (beginner → expert) in a split view: instructions · terminal · live cluster state. Hints, solution, **Check** button. |
| **Walkthrough labs** | 12 step-by-step guides for a real cluster |
| **kubectl simulator** | Deployments/ReplicaSets, StatefulSets, DaemonSets, Jobs, PVC binding, Services/Endpoints, HPA, PDB, scheduler (taints, affinity, spread), kubelet failures (ImagePullBackOff, CrashLoop, OOMKilled, probes), ResourceQuota/LimitRange, Pod Security Admission, NetworkPolicy, RBAC `can-i`, CRDs, Gateway API objects, Kustomize, bash-like shell with pipes/heredocs/`vi` |
| **Exam mode** | Timed CKA/CKAD/CKS-style sessions (30/60/120 min), no hints, scored at the end (pass ≥ 66%) |
| **Learning paths** | Ordered roadmap per track: modules → labs → quiz → exam |
| **Quiz** | 314 questions: multiple choice, *type the command*, *order the steps*; Leitner spaced repetition ("due for review") |
| **Modules** | 19 (adds Gateway API, CRDs/Operators, Kustomize, Helm, Pod Security, supply-chain, exam speed) |
| **Visualize** | Step-through animations: control-plane flow, pod lifecycle (incl. failures), rolling update, NetworkPolicy |
| **Errors** | 46-entry error encyclopedia with links to the labs that reproduce them |
| **Tools / cheatsheet** | 9 offline tools, 100+ copy-ready commands, Ctrl+K command palette |
| **Progress** | Saved in your browser only; export / import JSON; streaks |

## Offline

* **PWA** — open the site once; a nav badge shows *Caching n/N → ✓ Works offline*, and an **Install** button appears. After that it works with no network (service worker precaches everything, fonts are self-hosted).
* **Sessions survive reloads** — every lab's simulator state, files, terminal history and hint/solution usage are saved to IndexedDB after each command; a running exam (and its clock) is restored too. “Reset lab” starts over.
* **Safe updates** — a new version never swaps in mid-lab: you get a “new version ready — Reload” toast and apply it when you choose.
* **Storage** — the site requests persistent storage so browsers don't evict it; the *My progress* page shows the status, and nudges you to export a JSON backup every 2 weeks.
* **Single file** — `node build.cjs` → `dist/kubelab-offline.html` (~1 MB, no server, no network). Works from `file://`.
* No analytics, no counters, no third-party requests of any kind.

## Run on a real cluster (kind)

```bash
cd lab-packs
./kubelab.sh cluster                # needs Docker + kind
./kubelab.sh setup s02-imagepull    # break it
kubectl get pods -n shop            # fix it
./kubelab.sh check s02-imagepull    # same assertions as the browser Check button
```

Packs are generated from the same lab specs (`node tools/gen-packs.cjs`). They are syntax-checked but not every one has been run end-to-end on a real cluster — see `lab-packs/README.md`.

## Develop

```bash
npm i js-yaml                      # only needed to run the tests below
node tests/smoke.js                # simulator smoke test
node tests/labs.test.js            # every lab: fails when broken, passes with its solution
npm i playwright-core              # + a Chrome/Chromium for the browser tests
node tests/e2e.cjs                 # pages, runner, quiz, exam, palette, theme, mobile
node tests/offline.cjs             # service worker offline test
node tests/persist.cjs             # sessions/exam survive reload, offline badge, works offline
node tests/update.cjs              # update toast + Reload flow
node tools/gen-sw.cjs              # regenerate sw.js precache list after adding files
node tools/gen-packs.cjs           # regenerate lab-packs/
node build.cjs && node tests/single-file.cjs
```

Layout: `index.html` (content data + shell) · `assets/js/sim*.js` (simulator) · `assets/js/labs-engine.js` (assertion DSL → JS checker **and** bash generator) · `assets/js/data/labs-sim-*.js` (lab specs) · `lab-ui.js`, `exam.js`, `quiz.js`, `anim.js`, `extras.js` (UI).

Add a lab: append a spec to `assets/js/data/labs-sim-*.js` (setup YAML, tasks with assertions, solution) → `node tests/labs.test.js` must pass → regenerate packs and `sw.js`.

## Honest limits

The simulator is a **teaching model** of Kubernetes (v1.34 behaviour, simplified): no real networking/CNI, kernel, etcd or upgrades — use the kind packs and a real cluster for those, and a paid exam simulator (e.g. killer.sh, bundled with CKA/CKAD/CKS purchases) for the last week. Messages and defaults follow upstream closely but not byte-for-byte.

## License

MIT — see [LICENSE](LICENSE). Bundled: js-yaml (MIT), Inter, Syne, JetBrains Mono (SIL OFL) via @fontsource.

## New in this release
- **S74–S96**: CKS depth (S74–S78), day-2 ops (kubeadm upgrade, node replace, disk pressure), networking (CoreDNS, LoadBalancer, service ladder), scheduler/resources (priority, QoS, right-sizing, HPA vs quota), multi-cluster context labs, and six multi-step incident labs.
- **Field Guide → Flowcharts**: Pending, crash loops, Service unreachable, NotReady node, "autoscaling is not scaling" (incl. Cluster Autoscaler), each ending in a lab.
- **Terminal skins** and text size (saved in your browser). **Diagram**: hover a Service to see animated traffic lines and the Ingress→Service→Pod trace; click a Pending pod for the scheduler's reason.
- **Cautions**: every new lab has a "before you try this on a real cluster" note; risky commands (delete --all, force delete, drain, kubeadm reset, rm -rf, finalizer removal, apply from URL…) show a warning; pasting tokens/private keys into the terminal is blocked. These are guidance, not security controls. Session data lives unencrypted in your browser; use placeholder values only. Only run kind packs on throwaway clusters and check `kubectl config current-context` first.
- **Animated diagram**: pod birth ring, terminating fade, crash shake, controller-chain pulse (kubectl → API → controllers → scheduler → kubelet), scheduler arc when a Pending pod is placed, slide animation when pods move (drain/reschedule), "no fit" shake, per-Service endpoint dots, and traffic dots with blocked ✕ for matching-but-not-Ready pods. A Motion on/off toggle respects your OS setting.
- **Ghost typing**: click any command in a hint, the story or a task and it types itself into the terminal. The token you are typing is highlighted under the terminal.
- **Guided tour**: 🧭 Tour in the lab bar (auto-offered once) and a Guided UI tour in the Field Guide. Skins flicker briefly when switching to green or amber.
- **Unified UI**: refreshed dark tokens, a live cluster hero with proof chips, **Ctrl+K command palette** (labs, flowcharts, outages, pages), Incident/New tags on lab cards, progress ring with a locally generated **share card (PNG)**, task-timeline ticks, and **mobile lab tabs** (Tasks / Terminal / Cluster) on narrow screens.

## UI3 additions
- **Home**: aurora background, scrolling command strip, a "no payment gateway" section with an animated locked/open card, and a "Our promise" strip. `#why` has a generic paywall vs open comparison (no products are named).
- **Settings and privacy** (`#settings`, gear icon): theme, motion, terminal skin and size, default lab mode, backup / restore / clear progress, reset preferences. Everything stays in localStorage.
- **Break-it challenge** (`#break/<seed>`): the seed picks a lab deterministically; countdown, +30 s per hint, best times stored locally, share link carries only the seed.
- **Incident war room**: labs flagged `incident` get a SEV banner, a runbook that ticks as you work, and live service health bars.
- **Cluster canvas**: a "Canvas" tab in the lab cluster panel draws nodes, pods and request dots from the simulator state. It respects the Motion setting.
- Ctrl+K now opens a single palette (pages, modules, errors, commands, labs, flowcharts, outages, settings).
- Fixed: light theme no longer inherits the dark UI2 surface colours.

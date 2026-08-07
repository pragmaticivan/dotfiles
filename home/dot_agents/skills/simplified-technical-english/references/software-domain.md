# STE for software, cloud, and operations writing

ASD-STE100 grew out of aerospace maintenance manuals, so its examples talk
about flanges and hydraulic lines. The rules transfer without change; only the
vocabulary needs mapping. This file does that mapping and collects the
substitutions that recur in engineering documentation.

Source of the rules: ASD-STE100 Issue 9 (2025-01-15). Read
`writing-rules.md` for the normative text of any rule named here.

## Contents

1. [Which technical noun category covers a software term](#1-which-technical-noun-category-covers-a-software-term)
2. [Technical verbs in software work](#2-technical-verbs-in-software-work)
3. [Substitutions that recur in engineering writing](#3-substitutions-that-recur-in-engineering-writing)
4. [Code, commands, and identifiers](#4-code-commands-and-identifiers)
5. [Document patterns](#5-document-patterns)
6. [The project glossary](#6-the-project-glossary)

---

## 1. Which technical noun category covers a software term

Rule 1.5 permits a noun that is not in the dictionary if it belongs to one of
22 categories. Four of them carry almost all software terminology:

| Category (Rule 1.5) | Software terms it covers |
| --- | --- |
| 19 — Computer science, information and communication technology | `database`, `firewall`, `cursor`, `touchscreen`, `container`, `pod`, `queue`, `cache`, `endpoint`, `token`, `webhook`, `repository`, `branch`, `lockfile`, `namespace` |
| 6 — Systems, components and circuits, their functions, configurations, and parts | `load balancer`, `autoscaler`, `standby mode`, `read replica`, `worker`, `sidecar`, `control plane` |
| 7 — Mathematical, scientific, engineering terms, and formulas | `latency`, `throughput`, `percentile`, `checksum`, `entropy`, `time complexity` |
| 15 — Official documents, parts of documentation, standards, and guidelines | `runbook`, `changelog`, `ADR`, `Service Bulletin`, `RFC 7231`, `OpenAPI specification` |

Three more come up regularly: category 9 for units (`ms`, `GiB`, `qps`),
category 10 for text you cannot change (a log line, a button label, an error
string), and category 11 for organizations and roles (`AWS`, `on-call
engineer`, `platform team`).

A term that fits no category is not usable. `synergy`, `leverage` (as a noun),
`journey`, and `enablement` fit none of them, which is the point of the rule.

## 2. Technical verbs in software work

Rule 1.12 permits a verb from 4 categories, and category 2 (computer processes
and applications) is the one that matters here:

| Subcategory | Approved-by-category verbs |
| --- | --- |
| 2a — Input and output | `click`, `type`, `enter`, `swipe`, `digitize` |
| 2b — User interface and application | `copy`, `delete`, `paste`, `scroll`, `drag and drop`, `zoom in` |
| 2c — System operations | `boot`, `reboot`, `install`, `download`, `upgrade`, `debug` |

Rule 1.12 puts a hard condition on all of them: **do not use a technical verb
when approved dictionary words say the same thing.** This is the trap in
software writing, where jargon verbs feel natural.

| Do not write | Write | Why |
| --- | --- | --- |
| `Provision the cluster.` | `Make the cluster.` / `Install the cluster.` | `provision` is not in any category and `install` is approved. |
| `Deploy the service.` | `Install the service on the cluster.` | `deploy` is approved in category 20 for military operations, not for software; `install` (v) is in the dictionary. |
| `Spin up three workers.` | `Start three workers.` | `spin up` is slang (Rule 1.10). |
| `Detect the failed request.` | `Find the failed request.` | An approved verb exists (Rule 1.12). |
| `Kick off the job.` | `Start the job.` | Slang. |
| `Tear down the environment.` | `Remove the test environment.` | Slang, and `remove` is approved. |
| `Sunset the endpoint.` | `Stop the endpoint on 2026-09-01.` | Jargon that hides the date the reader needs. |

`reboot`, `boot`, `install`, `debug`, `download`, and `upgrade` are legitimate
technical verbs. Use them and stay consistent (Rule 9.4).

## 3. Substitutions that recur in engineering writing

The 39 recurring errors are in `word-selection.md`. These are the ones that
show up in code review, runbooks, and design documents on top of that list.

| Not approved | Use | Note |
| --- | --- | --- |
| `ensure` | `make sure` (v) | The single most frequent breach in engineering text. |
| `verify` | `make sure` (v) | Or `do a check of` when the reader inspects something. |
| `validate` | `make sure that ... is correct` | `validation` may be a technical noun; the verb is not approved. |
| `perform`, `execute` | `do` (v) | Then prefer a more accurate verb: `do a test of` -> `test`. |
| `utilize`, `leverage` | `use` (v) | |
| `should`, `shall` | `must` (v) | STE has no soft obligation. If it is optional, say `you can`. |
| `may` | `can` (v) | |
| `could` | `can` (v) | Rule for CAN: do not use `could` to show possibility. |
| `avoid` | `prevent` (v), `do not` | |
| `attempt`, `try to` | `try` (v) | |
| `require`, `required` | `necessary` (adj) | Needs a different construction (Rule 9.1). |
| `retrieve`, `fetch`, `obtain` | `get` (v) | |
| `terminate` | `stop` (v) | |
| `initiate`, `trigger` | `start` (v) | |
| `modify`, `update` | `change` (v) | |
| `configure` | `set` (v) | `Set the timeout to 30 s.` |
| `enable`, `disable` | `activate` (v), `deactivate` (v) | |
| `allow` | `let` (v), `permitted` (adj) | |
| `via`, `by means of` | `with` (prep), `through` (prep) | Read GR-2 before you use `with`. |
| `prior to` | `before` (prep) | |
| `in order to` | `to` | |
| `approximately N` | keep `approximately` (adv) | Approved. Do not write `about N`. |
| `e.g.`, `i.e.`, `etc.` | `for example`, `that is`, `and so on` | GR-6. |
| `simply`, `just`, `obviously` | delete | They tell the reader nothing and imply the task is easy. |
| `rotate` (a key) | `change` (v), `turn` (v) | `rotate` is a recurring error; `change the key` is clearer anyway. |
| `spawn`, `fire off` | `start` (v) | |
| `gracefully` | name the behavior | `The server completes the open requests before it stops.` |

## 4. Code, commands, and identifiers

STE governs prose. It does not govern code, and Rule 8.6 protects the things
you cannot change.

- **Code blocks and commands are not STE text.** Never reword a command to
  obey the dictionary. Put it in a fenced block and describe it in STE above.
- **Quoted text, log lines, button labels, and error strings** are unchangeable
  and count as one word (8.6 item 5, item 6). Quote them exactly, including
  British spelling or a typo in the original.
- **Identifiers** such as `HTTP 429`, `v2.3.1`, `us-east-1`, `PR-4821` count as
  one word (8.6 item 4). Rule 4.5 takes no definite article in front of one:
  write `Set flag CACHE_TTL to 60 s.`, not `Set the flag CACHE_TTL...`.
- **File paths and URLs** behave as identifiers. Keep them out of the sentence
  when they make it hard to read: put them in a vertical list.
- **Do not hide the action inside the command.** A step must say what happens:
  `Erase the pod. The autoscaler makes a new pod.` above the command, not the
  command alone.

## 5. Document patterns

### Runbook or procedure

Numbered steps, imperative, one action per step, 20 words. Conditions come
first: `If the alert is still active, restart the primary node.` Put limits and
results immediately after the action, not in a note: `Wait 30 s. The status
must change to READY.`

### README or design document

Descriptive, 25 words, no imperative except in the sections that give
instructions (installation, usage). Start each paragraph with its topic
sentence (6.4, 6.5) and give the information gradually (6.1) — what the system
is, then what it does, then how.

### Incident update or status page

Descriptive. State the effect on the reader first, then the cause, then the
next update time. The passive is permitted only when the agent is unknown,
which during an incident is often true and honest: `The data was corrupted
during transmission.`

### Alert text and error messages

The tightest case: one sentence, one meaning, and a stated consequence or next
action. `The disk is 95% full. The service stops when the disk is full.` beats
`Disk utilization threshold exceeded.`

### API documentation

Each field description is one descriptive sentence. Keep one term for one
concept across every endpoint (1.11) — a `user_id` is not a `member ID` two
sections later.

## 6. The project glossary

Rule 1.8 tells you to use the technical noun that is already approved in your
company or subject field, and Rule 1.11 tells you to use one term per item.
Both need a written list, so keep a glossary next to the document set. Record:

- the term, its Rule 1.5 category or Rule 1.12 category,
- a one-sentence definition in STE,
- the terms it replaces, so a reviewer can find the drift.

When a word is in neither dictionary, that is the prompt to add it to the
glossary or to replace it. An unrecorded term is how a document ends up with
three names for one thing.

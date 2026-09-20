# Vault expansion roadmap

A standing backlog of new vault categories, ordered by dependency, plus
the authoring conventions two of them need. Twenty-two categories and
roughly 200 notes — it roughly doubles the vault, from 20 categories to 42. Treat it as a queue to
draw from, not a project with a completion date: the ordering is the
deliverable, finishing it is not.

Each category lands as its own PR. This document does not change any
code; the only pipeline- or app-level question it raises (math
rendering) is deliberately answered by an authoring convention rather
than a feature, for reasons in §3.

## 1. Motivation

The vault today is 178 notes across 20 categories and 7 topics, strong on how
machines work: operating systems, algorithms, networking, data systems,
concurrency, and eight AWS services. It has three kinds of gap.

**Load-bearing concepts referenced but never defined.** No note defines
a certificate, a TLS handshake, or a VPC, yet
`vault/aws/lambda/networking-and-vpc.md` assumes the last of these and
several notes assume the first two. These are the highest-value gaps
because existing notes are already weaker for their absence.

**Whole subjects absent.** Identity and authentication (there is
`aws-iam`, but nothing on how humans or applications actually
authenticate); cryptography; mathematics.

**Truncated sources.** CLRS is missing string matching and
intractability. DDIA stops around chapter 9, with no batch or stream
processing — odd next to ten notes of AWS messaging material.

## 2. Categories, in order

Sizing follows the README's 8–12 notes per category. `topic` is the
shelf for bulk-muting; `category` is what interleaving and mastery bars
key on.

| # | `topic` | `category` | Covers |
|---|---------|-----------|--------|
| 1 | `math` | `math-probability` | Sample spaces, conditional probability, Bayes, expectation/variance/linearity, common distributions, tail bounds, CLT, indicator variables |
| 2 | `security` | `security-crypto` | Hashes, HMAC, symmetric vs. asymmetric, signatures, KDFs, CSPRNGs, AEAD, key rotation, what each primitive does *not* give you |
| 3 | `security` | `security-tls` | Handshake 1.2 vs. 1.3, cert chains and PKI, cipher suites, SNI, ALPN, forward secrecy, revocation, mTLS |
| 4 | `networking` | `http-protocol` | HTTP/1.1 connection reuse limits, HTTP/2 framing and multiplexing, HPACK, HTTP/3 and QUIC, head-of-line blocking across layers, ALPN, method and status-code semantics, idempotency and safety |
| 5 | `api-design` | `api-rest` | REST constraints, resource modelling, safe vs. idempotent methods, pagination, versioning, error formats, conditional requests and concurrency, HATEOAS in practice |
| 6 | `api-design` | `api-grpc` | Protobuf wire format and schema evolution, the four call types, streaming, deadlines and cancellation, metadata, status codes, gRPC-web, choosing among gRPC/REST/GraphQL |
| 7 | `aws` | `aws-networking` | VPC, subnets, route tables, IGW/NAT, SGs vs. NACLs, VPC endpoints, PrivateLink, peering/TGW |
| 8 | `identity` | `identity-oauth` | Authorization code + PKCE, client credentials, device code, refresh rotation, scopes vs. audience, ID vs. access token, front/back channel |
| 9 | `identity` | `identity-sessions` | Cookie attributes, CSRF, token storage, password hashing, TOTP/WebAuthn, JWT-vs-session |
| 10 | `identity` | `identity-saml` | Assertions, SP- vs. IdP-initiated, bindings, metadata, NameID, SLO, SAML-vs-OIDC |
| 11 | `identity` | `identity-auth0` | Tenants, apps vs. APIs, connections, Actions pipeline, Universal Login, namespaced claims, Organizations, RBAC |
| 12 | `aws` | `aws-security` | KMS keys/grants/envelope encryption, Secrets Manager vs. Parameter Store, rotation |
| 13 | `aws` | `aws-observability` | CloudWatch metrics/logs/alarms, Logs Insights, X-Ray, EMF, retention cost |
| 14 | `aws` | `aws-step-functions` | State machine model, standard vs. express, retry/catch, saga |
| 15 | `aws` | `aws-kinesis` | Streams vs. Firehose, shards, consumer models |
| 16 | `aws` | `aws-edge` | CloudFront behaviors, OAC, Route 53 policies, ACM, WAF |
| 17 | `math` | `math-linear-algebra` | Vectors, dot/cross, span/basis, matrices as maps, rank/null space, determinant, eigen, projections, SVD |
| 18 | `math` | `math-calculus` | Limits, derivative rules, chain rule, second derivative and convexity, Taylor, integrals |
| 19 | `math` | `math-multivariable` | Partials, gradient, directional derivatives, Jacobian/Hessian, multivariable chain rule, Lagrange |
| 20 | `algorithms` | `algo-strings` | KMP, Rabin-Karp, tries, suffix structures |
| 21 | `algorithms` | `algo-intractability` | P/NP, reductions, NP-completeness catalog, approximation |
| 22 | `data-systems` | `data-processing` | Batch (MapReduce, joins), stream (event time vs. processing time, windows, exactly-once) |

Physics comes after #22, scoped when reached rather than guessed at
now. It is last deliberately: it is the only area on this list that
feeds nothing else in the vault, so it earns its review cost purely on
interest.

### Why this order

Dependency, with one exception. `security-crypto` precedes
`security-tls`, which precedes both the `identity-*` run and
`aws-security` (KMS is unreadable without envelope encryption).
`aws-networking` precedes nothing here but is pulled early because
existing notes already depend on it. `http-protocol` follows
`security-tls` because HTTP/2 negotiation is ALPN and HTTP/3 embeds TLS
1.3 outright, and `api-grpc` follows `http-protocol` because gRPC is
defined on HTTP/2 framing — its streaming modes and deadlines are
unreadable without it. Within `identity`, each category
leans on the one before, and the vendor-specific `identity-auth0` goes
last so it rests on a foundation — it is also the category most likely
to rot, being the only one describing a product rather than a protocol.

The exception is `math-probability` at #1, out of dependency order. It
is the mathematics that connects to material already in the vault —
CLRS probabilistic analysis, randomized quicksort, hash-table load
factors, and FSRS's own model — so it earns reviews immediately, and it
is the math least harmed by the rendering constraint in §3.

### Naming

New categories take a `topic`-matching prefix (`identity-*`,
`security-*`, `math-*`, `api-*`), consistent with `aws-*`, `algo-*` and
`os-*`. `http-protocol` is the exception: it joins the existing
`networking` topic, whose sole category is the bare `networking`, so a
`networking-*` prefix would sit oddly next to it.
The convention is not universal in the vault already — `amp` and
`data-systems` are bare — but it is the majority pattern.

`http-protocol` does not absorb the existing
`vault/networking/http.md`, which stays as it is in `category:
networking` as part of the ten-note Kurose set. That note already covers
persistent vs. non-persistent connections, cookies, conditional requests
and 304, so `http-protocol` must not re-cover them: duplicate cards on
one fact waste reviews and read as a vault bug when both surface in the
same session. `http-protocol` starts where that note stops — at why
HTTP/1.1 connection reuse was not enough, which is also the motivation
for HTTP/2.

`data-processing` is a new category rather than an extension of
`data-systems`, which sits at 9 notes; appending DDIA ch. 10–11 would
push it past the sizing rule. Same folder, same topic shelf, new
category.

## 3. Authoring mathematics without formula rendering

`app/src/ui/renderers.ts` escapes every prompt and answer to plain
text. There is no markdown rendering, no KaTeX, and no math dependency
in `package.json`. A LaTeX fragment would display literally on the
phone, and because cloze answers are typed with exact matching, a
cloze over a LaTeX expression would be effectively unreviewable.

This roadmap answers that with conventions, not a feature. Adding
KaTeX is a defensible separate project, but it is not a prerequisite:
the card design below is the better design even with rendering present,
because cloze-typing a formula on a phone is a bad card regardless.

**Display formulas go in fenced code blocks.** The parser skips fences
entirely, so a formula there can never produce a broken card, and
Obsidian's monospace preserves ASCII alignment. Fences are the note's
reference layer — what you read when you open it, not what you are
quizzed on.

**Cloze covers words and short ASCII atoms only.** Under roughly 25
characters, no LaTeX, no Unicode, typeable on an iPhone keyboard.
`==column space==` and `==steepest ascent==` are good cards. Unicode,
including the gradient and partial-derivative symbols, is fine in prose
and in QA or recall *answers*; it never appears inside `==...==`.

**One fixed ASCII notation across all four math categories:** `d/dx`,
`∂f/∂x`, `∇f`, `A^T`, `x·y`, `||x||`, `E[X]`, `Var(X)`, `P(A|B)`,
`sum_{i=1}^n`, `int_a^b`. The point is that cards never disagree with
each other about how a concept is written.

**Formula recall uses `recall` callouts with a `> ---` model answer.**
This is what replaces LaTeX cloze: you reproduce the formula mentally
and grade yourself against the answer below the divider.

**MCQ carries the discrimination load.** Choosing the correct form
among plausible wrong ones tests exactly the confusions that matter —
gradient versus Jacobian shape, `Var(X+Y)` with and without
independence — and requires no typing.

**QA carries the "why" and "when":** intuitions, when a theorem's
hypotheses hold, why a result takes the form it does.

Net effect: math notes skew toward recall and MCQ, with far less cloze
than the systems notes.

If KaTeX is added later, this convention survives it. The fenced
formulas become a mechanical `$$` conversion, and the cloze/recall/MCQ
split stays correct as written.

## 4. How a category lands

**One category per branch, one branch at a time.** Sequential, not
parallel: every PR regenerates `deck/deck.json`, so two category
branches in flight guarantee a conflict in that file. Branches follow
the repo convention — `feat/math-probability`, `feat/security-tls` —
since new material is a feature of the deck.

**Two review gates per PR, cheap one first.** Before any notes are
written, the proposed split for that category is posted as just the
8–12 subject titles, for confirmation of the boundaries. Correcting
"these two are one note" costs a sentence then and a rewrite later. The
notes themselves are then reviewed in Obsidian before merge.

**The build output is part of the commit.** `build:deck` mints
`^card-xxxx` anchors into the vault and regenerates `deck.json`, so new
notes always dirty the tree. Per PR: write notes, run `build:deck`,
commit the generated anchors and `deck.json` alongside the notes. Only
then is the tree clean, and CI's drift check passes:

```bash
npm test && npm run typecheck && npm run build:deck && git status --porcelain
```

That must print nothing before the PR opens.

**Self-checks, specifically the failures that are silent rather than
loud:**

- No hand-written or edited `^card-xxxx` anchors. The build owns them,
  and editing one orphans that card's FSRS history on the next rebuild.
- No cloze restating its own answer later in the same paragraph.
  `pipeline/tests/cloze-self-answer.test.ts` catches it, but each note
  is worth reading for it, since the parser joins a whole prose run into
  a single prompt.
- 8–12 notes, subject-scoped rather than chapter-scoped.
- `topic` and `category` exactly as §2 specifies.

**One authoritative source per category, recorded in frontmatter
`citations`,** so a wrong card is traceable:

| Category | Source |
|---|---|
| `math-probability` | Blitzstein & Hwang, *Introduction to Probability* |
| `math-linear-algebra` | Strang, *Introduction to Linear Algebra* |
| `math-calculus`, `math-multivariable` | Hubbard & Hubbard |
| `security-crypto` | Aumasson, *Serious Cryptography* |
| `security-tls` | RFC 8446; Ristić, *Bulletproof TLS* |
| `http-protocol` | RFCs 9110–9114 (HTTP semantics, /1.1, /2, /3) |
| `api-rest` | Fielding's dissertation, ch. 5; RFC 9110 |
| `api-grpc` | grpc.io documentation; Protocol Buffers language guide |
| `identity-oauth` | RFCs 6749, 6750, 7636; OAuth 2.1 draft |
| `identity-saml` | OASIS SAML 2.0 specification |
| `identity-sessions` | OWASP Session Management Cheat Sheet |
| `identity-auth0`, all `aws-*` | Official product documentation |
| `algo-strings`, `algo-intractability` | CLRS |
| `data-processing` | Kleppmann, *Designing Data-Intensive Applications* |

**Worktree hygiene.** Each category's worktree is removed once its
branch merges, per CLAUDE.md, rather than left to accumulate.

## 5. Out of scope

- **KaTeX or any math rendering in the app or pipeline.** §3 is
  deliberately a convention, not a feature request. If plain-text math
  proves limiting after the first math category ships, that becomes its
  own spec.
- **Physics category structure.** Scoped when reached.
- **Any change to the parser, scheduler, or app.** This roadmap adds
  vault content only.
- **Subjects considered and deferred:** SQL and Postgres internals, API
  design (REST/gRPC/GraphQL), language type systems, distributed-system
  patterns as patterns, SRE and SLOs, Git internals, application
  security. All defensible additions; none blocks or is blocked by the
  nineteen above, so they queue behind them rather than competing for a
  slot.

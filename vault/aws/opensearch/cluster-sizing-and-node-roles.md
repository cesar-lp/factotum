---
topic: aws
category: aws-opensearch
tags: [node-roles, master-eligible, quorum, split-brain]
citations: ["AWS Developer Guide — Amazon OpenSearch Service, 'Dedicated master nodes'", "OpenSearch Documentation — 'Cluster formation'"]
---

# Cluster Sizing and Node Roles

Not every node in an OpenSearch cluster does the same job. A domain is
built from a mix of node roles, and the split between them exists mainly
to keep the one job that must never fail under load — deciding who is in
charge of the cluster — insulated from the jobs that create that load.

A **data node** holds shards and executes the actual indexing and search
work against them; it is the role that scales with data volume and query
throughput, and the one most exposed to CPU and memory pressure from heavy
traffic.

A **coordinating node** (or coordinating-only node) receives a client
request, fans it out to the relevant data nodes, and merges their partial
results before returning a single response — it does no indexing itself,
which frees it to specialize in request routing and result aggregation
under high query concurrency.

A ==master-eligible== node can be elected to manage cluster-level state ^card-dtg3
— which nodes are in the cluster, which shard copies are primary versus
replica, and index creation and deletion — but does not need to hold data
or serve queries itself.

> [!card] mcq
> Why does AWS recommend dedicated master nodes (master-eligible only, no
> data or client traffic) for larger OpenSearch domains?
> - [x] So that cluster-management decisions (like electing a new leader or reassigning shards) stay responsive even when data nodes are overloaded by indexing or query traffic
> - [ ] Because only dedicated master nodes are capable of storing shards
> - [ ] Because coordinating nodes cannot exist in a cluster with dedicated masters
> - [ ] Because dedicated masters remove the need for replica shards ^card-51qw

Master-eligible nodes elect one of themselves as the acting cluster
manager using a quorum-based protocol, the same mechanism underlying
Raft leader election in `database-internals/consensus.md`: a candidate
needs votes from more than half of the master-eligible nodes to be
elected, and that majority requirement is what a "split-brain" scenario
threatens to break.

**Split-brain** is the failure mode where a network partition lets two
disjoint groups of nodes each believe they are the legitimate cluster and
elect their own separate manager, after which the two halves can diverge
— for example both accepting index creation requests with the same name.

Why does requiring a strict majority of master-eligible votes (not just "the most votes so far") prevent split-brain, given the same reasoning as majority quorums in Raft or Paxos? :: Any two groups that could each claim a majority out of the same fixed set of master-eligible nodes would have to overlap in at least one node, and that node cannot vote for two different candidates at once — so at most one side of a partition can ever actually gather a majority, and the other side is left unable to elect a manager at all rather than electing a conflicting one. ^card-ytys

> [!card] recall
> An OpenSearch domain has three master-eligible nodes and a network
> partition splits it into a group of two and a group of one. Using the
> majority-quorum reasoning from `database-internals/consensus.md`,
> explain which group (if either) can elect a cluster manager, and why an
> even split (e.g. 2 and 2 out of four master-eligible nodes) is a
> genuinely worse configuration. ^card-21z2

Using an ==even== number of master-eligible nodes is a common sizing ^card-xm2j
mistake, because it creates configurations where no group can gather a
strict majority during a partition, leaving the cluster with no manager
at all until connectivity is restored — an odd count avoids this by
guaranteeing one side always has more votes than the other.

What job does a coordinating-only node take on that a combined data-and-master node handles less predictably under load? :: It absorbs the work of fanning a client request out across shards and merging their partial results, keeping that request-routing and aggregation load off nodes that also need spare CPU and memory for indexing, search execution, or cluster management. ^card-6je3

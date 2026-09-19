---
topic: database-internals
category: database-internals
tags: [paxos, raft, two-phase-commit, consensus, leader-election]
citations: ["Petrov, Database Internals, Ch. 13-14"]
---

# Consensus and Atomic Commitment

**Paxos** is a family of protocols letting a set of nodes agree on a
single value despite failures and message delays, built around two
phases: in the **prepare** phase a proposer asks more than half the
acceptors to promise not to accept any proposal numbered lower than
its own, and in the **accept** phase it asks that same group to
actually accept a value. Because both phases require agreement from a
==majority== of nodes, and any two such quorums out of a fixed set must ^card-ubdh
overlap in at least one node, an acceptor that already promised a
higher-numbered proposal blocks a stale proposer from committing a
conflicting value — this quorum overlap is the core mechanism, not
just a vague assertion that Paxos "prevents" conflicting decisions.

> [!card] mcq
> Why must a Paxos proposer get agreement from a majority of acceptors,
> rather than just one or two?
> - [x] Any two majorities out of the same set of nodes are guaranteed to overlap in at least one node, which is what stops two different proposals from both being accepted as the decided value
> - [ ] A majority is required only to make the protocol fair to slow nodes
> - [ ] Majorities are not actually required; any single acceptor's agreement is sufficient
> - [ ] It guarantees every node applies the accepted value at the same wall-clock instant ^card-tfl3

**Raft** is designed to be an easier-to-implement alternative to Paxos
that reaches the same kind of agreement, structured around a single
elected leader. Leader election uses randomized election timeouts: each
follower waits a randomized interval without hearing from a leader
before becoming a candidate and requesting votes, and a candidate that
wins votes from a majority becomes leader for that ==term==; the ^card-tl1c
randomization makes it unlikely that two nodes become candidates at the
same moment and split the vote repeatedly.

> [!card] mcq
> What is the purpose of Raft's randomized election timeout?
> - [x] It makes it unlikely that multiple followers become candidates simultaneously, reducing repeated split votes and helping a leader get elected quickly
> - [ ] It guarantees an election never needs more than one round under any circumstances
> - [ ] It removes the need for a majority vote to elect a leader
> - [ ] It synchronizes every node's clock to the same value ^card-ejvd

Once elected, a Raft leader handles all client writes and replicates
each one as a log entry to its followers; an entry is considered
==committed== once a majority of nodes have stored it in their log, ^card-mnci
after which the leader applies it to its state machine and informs
followers to do the same on their next contact. A stale leader (one
that lost contact and no longer holds a majority) cannot get any new
entry across that same threshold, because it cannot reach a majority
of nodes.

What does a Raft term number protect against, given that leader election can occasionally produce more than one node that believes it is leader? :: A term is a monotonically increasing counter that every message carries; a node that sees a higher term than its own steps down, so at most one leader can actually get entries committed for any given term (an old leader from a stale term is rejected once a follower has seen a newer term), preventing two leaders from both successfully appending conflicting log entries. ^card-7e8t

**Two-phase commit (2PC)** coordinates an atomic commit across multiple
independent participants (e.g. separate databases) using a coordinator:
in the prepare phase every participant is asked to get ready to commit
and replies yes/no, and in the commit phase the coordinator tells all
participants to actually commit (if all said yes) or abort (if any said
no). The protocol's well-known weakness is that if the coordinator
crashes after participants have voted yes but before it sends the
commit/abort decision, those participants are stuck: each has already
promised it *can* commit and cannot unilaterally abort or commit without
knowing the coordinator's decision, so they must ==block== and hold ^card-mxxf
their locks until the coordinator recovers or someone else can
determine the outcome.

> [!card] mcq
> Why does two-phase commit block when the coordinator crashes after the
> prepare phase completes but before the commit/abort decision is sent?
> - [x] Participants that voted "yes" have promised they can commit and must wait for the coordinator's decision, since they cannot safely decide commit or abort on their own without risking disagreement with other participants
> - [ ] Participants automatically abort after a short timeout, so there is no actual blocking
> - [ ] The coordinator's crash immediately aborts the transaction on all participants
> - [ ] 2PC has no coordinator, so this scenario cannot occur ^card-br12

Replacing a single 2PC coordinator with a Raft-elected group does not
make atomic commitment itself non-blocking by magic: consensus can make
the *coordinator* highly available (a new coordinator can be elected if
the old one fails, since its state is replicated), but the underlying
two-phase commit protocol between coordinator and participants is
unchanged — participants who voted yes still cannot proceed until
*some* coordinator (old or newly elected) tells them the outcome, so a
long enough gap in coordinator availability still blocks those
participants, even though the coordinator role itself no longer has a
single point of failure.

> [!card] recall
> A system replaces its single 2PC coordinator with a Raft-replicated
> group of coordinators. Explain precisely what this change does and does
> not fix about 2PC's blocking behavior. ^card-hphb

**Three-phase commit (3PC)** adds an extra phase intended to make commit
decisions non-blocking under a coordinator failure, by ensuring
participants have enough information to independently decide the
outcome — but it depends on assumptions (like bounded network delay)
that don't hold on a real asynchronous network, which is a large part of
why it is rarely used in practice compared to consensus-based
replication of the coordinator itself.

> [!card] mcq
> What was 3PC's goal relative to 2PC, and why is it rarely used in
> practice?
> - [x] It aimed to avoid blocking on coordinator failure, but it relies on bounded network delay assumptions that don't hold on real asynchronous networks
> - [ ] It aimed to reduce the number of participants required, and is rarely used because it needs at least 100 nodes
> - [ ] It aimed to remove the need for a coordinator entirely, and is rarely used because it requires no coordinator at all
> - [ ] It aimed to make commits faster by skipping the prepare phase, and is rarely used because it is slower than 2PC in every case ^card-eia3

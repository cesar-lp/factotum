---
topic: aws
category: aws-step-functions
tags: [step-functions, asl, orchestration, state-machine]
citations: ["AWS Step Functions Developer Guide — 'Amazon States Language'"]
---

# State Machines and the Amazon States Language

A Step Functions state machine is not code you deploy and run — it's a
JSON document, written in the **Amazon States Language** (ASL), that
*describes* states and the transitions between them. AWS reads that
document and manages the orchestration itself: which state runs next,
what retries on failure, how long something has been waiting. The notes
that follow cover individual state types and processing rules; this one
covers the trade-off underneath all of them.

What do you give up, and what do you get, by describing a workflow in ASL instead of writing its control flow in a language like Python or Java? :: You give up expressing branching, looping, and error handling in a language you already know — ASL is JSON, not a programming language, so "logic" becomes declarative fields in a document. In exchange you get durable execution that survives a crash mid-workflow, a visible event history for every run, and no servers or containers of your own to keep running the orchestrator. ^card-pwqp

Every ASL document is built from a handful of state types, distinguished
by what they *do* rather than by any shared shape. A **Task** state does
actual work — invoking a Lambda function or another AWS service. A
**Choice** state branches, picking the next state based on conditions
over the current data. A **Map** state iterates the same steps over each
element of an array. A **Parallel** state forks into fixed, independently
defined branches that all run at once. A **Wait** state pauses for a
duration or until a timestamp. A **Pass** state passes its input through,
optionally transforming it, without calling anything external. **Succeed**
and **Fail** end the execution outright.

> [!card] mcq
> A state needs to run the same three-step sequence once per item in an
> input array, without knowing the array's length in advance. Which state
> type is built for this?
> - [x] Map
> - [ ] Parallel
> - [ ] Choice
> - [ ] Pass ^card-t40q

Exactly one state in the document is designated the entry point, named
by the top-level ==StartAt== field — there's no ambiguity about where an ^card-lebk
execution begins, because the document can only name one.

Every state that isn't terminal must say where control goes next: either
a `Next` field naming the following state, or, for the states that end
the machine, `End` set to `true`. There is no implicit fallthrough to
"whatever's written below it" the way there is in ordinary code — ASL has
no notion of sequential position on the page.

What happens if a non-terminal state's definition is missing both a `Next` field and `End: true`? :: The state machine fails to validate, and Step Functions rejects the deployment outright. A dangling state with no way forward is a definition error, not something that surfaces only when an execution happens to reach it at runtime. ^card-ffpc

Once deployed, starting a state machine creates an **execution** — a
durable object with its own Amazon Resource Name, entirely separate from
the state machine's own ARN. Every state it enters, every input and
output, every retry and error is appended to that execution's event
history, which is what makes a workflow from three days ago as
inspectable as one that just finished.

> [!card] recall
> A teammate says debugging a Step Functions workflow feels like debugging
> a distributed system rather than a single program, even though only one
> execution runs at a time. What about the execution model justifies that
> comparison, and what does the event history give you that a stack trace
> from a crashed script would not?
> ---
> Like a distributed system, the execution's state lives outside any single
> process — it's a durable, externally-tracked object, so a crash in the
> underlying infrastructure doesn't erase progress or context the way a
> killed process would. The event history gives you the full sequence of
> state transitions, inputs, and outputs across the entire execution, not
> just where it happened to be when something failed — closer to a full
> distributed trace than a stack trace pointing at one moment in time. ^card-aynf

The other thing that's easy to bring in from ordinary programming and
regret: there are no variables in the traditional sense. What flows from
one state to the next is ==data== — a single JSON value, transformed and ^card-w5pa
passed forward by each state — rather than named bindings you assign and
read.

`input-and-output-processing.md` covers exactly how that JSON value gets
shaped as it moves between states.

Why does modeling "what passes between states" as a single evolving JSON value, rather than a set of named variables, matter once a workflow has more than a couple of states? :: Because every state's effect on the data is then fully visible in that state's own JSON — the input path, transformation, and output path — rather than scattered across implicit reads and writes to variables declared elsewhere. It's also exactly what a Task state's execution role receives and returns, so there's one uniform mechanism instead of a separate one for "variables" versus "service calls." ^card-2i4f

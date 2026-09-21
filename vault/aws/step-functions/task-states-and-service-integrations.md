---
topic: aws
category: aws-step-functions
tags: [step-functions, task-state, service-integrations, iam, timeouts]
citations: ["AWS Step Functions Developer Guide — 'Service integrations'"]
---

# Task States and Service Integrations

`state-machines-and-the-amazon-states-language.md` lists Task as the state
that does actual work; this note covers what "work" means once you notice
Step Functions can call AWS services directly, without a Lambda function
sitting in between as glue.

A Task state names a `Resource` — most often a Lambda function ARN, but
just as often an ARN identifying an action on another service: starting
an ECS task, running a Glue job, putting an item in DynamoDB, publishing
to SNS. Calling the service directly removes the Lambda you would
otherwise have written purely to translate "step in a workflow" into "API
call" — but it also moves that call's shape and parameters into the state
machine's JSON instead of a language you can unit test and step through.

Why is skipping the "glue Lambda" in front of a direct service call a trade rather than a pure win? :: It removes code you'd have to write, deploy, and maintain, but the request's shape — which parameters, which fields — now lives as JSON in the state machine definition instead of in a language with types, tests, and a debugger, so mistakes there surface later and are harder to unit test in isolation. ^card-15t5

Every direct service integration picks one of two patterns, and choosing
the wrong one is how a workflow reports success before its work is
actually finished. The **request-response** pattern fires the underlying
API call and moves to the next state as soon as that call returns — for
something like `ecs:RunTask`, that's the moment the task was *launched*,
not the moment it finished. The `.sync` pattern instead waits for the
underlying job itself to reach a terminal state before advancing — Step
Functions polls or listens for completion of that ECS task, that Glue
job, that Batch job, and only then moves the workflow forward.

> [!card] mcq
> A Task state starts a long-running Glue ETL job using the plain
> request-response integration (no `.sync` suffix) and its `Next` state
> assumes the transformed data already exists in S3. What is most likely
> to go wrong?
> - [x] The workflow advances as soon as the Glue job *starts*, so the next state can run against data that doesn't exist yet
> - [ ] The Task state will hang forever waiting for the Glue job to finish
> - [ ] Step Functions automatically retries until the Glue job completes
> - [ ] Nothing — request-response always waits for job completion by default ^card-ajow

A workflow that "succeeds" before the job it kicked off is done is
usually a `.sync` integration that was left as plain request-response —
the state machine has no way to know a job it never waited on isn't
finished.

Not every service call goes through the same door. **Optimized
integrations** are a curated set of services with first-class ASL support
— richer error handling, and for some, the `.sync` and `.waitForTaskToken`
suffixes.

`callbacks-and-waiting-for-external-work.md` covers `.waitForTaskToken` in
full; this note only needs that it exists as a third pattern alongside
request-response and `.sync`.

Everything else reaches AWS through the ==AWS SDK== integration, which ^card-o0p8
exposes most of the SDK's API surface as a generic Task resource, at the
cost of the convenience the optimized integrations provide.

Why would a team reach for the AWS SDK integration on a service that also has an optimized integration available? :: Ordinarily they wouldn't — the optimized integration's richer error handling and native sync/callback support is worth having. The SDK integration matters for the much larger set of services and API actions that have no optimized integration at all, where it's the only way to call them directly from a Task state instead of writing a Lambda wrapper. ^card-524s

A Task state runs under the state machine's own **execution role** — an
IAM role attached to the state machine, not to whatever called
`StartExecution`. Permissions for every service a Task touches must be
granted to that role.

Why does IAM authorization for a Task state depend on the state machine's execution role rather than on the identity that started the execution? :: Because the Task state's API calls are made by the Step Functions service on the state machine's behalf, using the execution role's credentials — the caller that started the execution is only ever authorizing the StartExecution call itself, and has no bearing on what the workflow is subsequently allowed to do. ^card-5z3b

Two fields keep a Task from stalling a workflow forever, and they bound
different things. `TimeoutSeconds` bounds how long the whole task is
allowed to run in total before Step Functions fails it. `HeartbeatSeconds`
bounds the gap *between* progress signals from a long-running task that
uses a task token, and fails the task if that gap is exceeded even while
the overall timeout hasn't been reached yet.

A task that's actively heartbeating every minute but never actually finishing would eventually be stopped by which of the two settings, `TimeoutSeconds` or `HeartbeatSeconds`? :: TimeoutSeconds — regular heartbeats keep satisfying HeartbeatSeconds indefinitely, so only the overall time limit on the whole task catches a job that's alive but never converging. ^card-of5z

A Task state with ==neither== field set can hang a workflow indefinitely — nothing else in ASL puts a ceiling on how long a Resource call is allowed to take. ^card-1jfj

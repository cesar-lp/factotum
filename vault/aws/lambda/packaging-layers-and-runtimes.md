---
topic: aws
category: aws-lambda
tags: [lambda, packaging, layers, container-images, runtime-api]
citations: ["AWS Lambda Developer Guide — 'Lambda deployment packages', 'Lambda layers', 'Building custom Lambda runtimes'"]
---

# Packaging, Layers, and Runtimes

A Lambda function is, underneath the console, just code plus a runtime
packaged up so the execution environment has everything it needs to run
your handler. AWS gives you two different ways to package that, plus a
mechanism for sharing code across functions, plus a documented interface
for supplying a runtime AWS doesn't ship one for.

A **zip archive** deployment package bundles your code and its
dependencies directly; Lambda unpacks it into the execution environment
and runs it against one of the language runtimes AWS manages for you.

A **container image** deployment package is instead a full ==OCI image==, ^card-0wzb
built from a base image implementing the Lambda runtime API, giving you
control over the entire dependency tree and OS-level libraries rather than
just the application code.

> [!card] mcq
> What is the main practical reason a team would choose a container image over a zip package for a Lambda function?
> - [x] They need OS-level dependencies or a dependency tree too complex to fit AWS's managed runtime environment cleanly
> - [ ] Container images start up faster than zip packages in every case
> - [ ] Only container images support environment variables
> - [ ] Zip packages cannot be versioned ^card-1gg6

Why might a team with a heavy native-library dependency (e.g. a machine-learning framework with compiled binaries) prefer packaging as a container image? :: A container image lets them control the exact base OS and every system library the dependency needs, rather than being constrained to whatever a managed runtime's execution environment already provides, which matters when a native dependency needs libraries or versions outside that managed environment. ^card-vzyc

A **layer** is a zip archive of shared code or dependencies — a library
used by several functions, or a common set of utilities.

Lambda merges a function's configured layers into the execution
environment's filesystem alongside its own package, which is what lets
several unrelated functions reference the same ==shared dependency== ^card-kufz
instead of each bundling its own private copy of it.

Layers version independently of the function that uses them, which means
updating a shared library used by ten functions can be done by publishing
a new layer version and pointing functions at it, rather than
redeploying every function's own package.

What is a limitation of layers that a container image's dependency model doesn't share? :: A layer is still just a zip archive merged into a managed runtime's filesystem, so it inherits that runtime's constraints (the same base OS, the same set of system libraries) — it can share code across functions but it can't give a function a fundamentally different base OS or system library set the way packaging as a container image can. ^card-ky6j

The **Lambda Runtime API** is the HTTP-based interface a runtime uses to
fetch the next invocation event and return its response; AWS's managed
runtimes implement it for you, but a ==custom runtime== implements it ^card-zs1c
directly, which is how languages and versions AWS doesn't natively support
still get to run on Lambda.

> [!card] recall
> Explain what "custom runtime" actually means at the mechanism level — it
> is not a new execution model, but an implementation of something
> specific. What is that something, and what does the custom runtime's
> code have to do in a loop to keep the function serving invocations? ^card-jt7n

Why does packaging as a container image not change anything about the execution environment's init-and-invoke lifecycle? :: Container image is only a packaging format for getting code and its dependencies into the execution environment; the environment still goes through the same init and invoke phases, still gets reused across invocations the same way, and still cold-starts the same way — packaging choice affects what's inside the environment, not how the environment itself behaves. ^card-t7u1

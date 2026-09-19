---
category: os-virtualization
tags: [processes, process-api, fork, exec, wait]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 4 (Processes)", "Arpaci-Dusseau, OSTEP, Ch. 5 (Process API)"]
---

# Processes and the Process API

A process is the OS's abstraction for a running program: it packages a
program's machine code, its address space (memory), and the CPU register
state (program counter, stack pointer, general-purpose registers) that a
single execution needs to make forward progress. Virtualizing the CPU
means the OS lets many processes believe each has the whole machine to
itself, by rapidly switching which one's state is loaded onto the real
hardware.

The OS tracks a process's status internally, typically as one of three
states: it is ==running== when its instructions are actually executing ^card-etmx
on a CPU, ==ready== when it could run but the OS has chosen another ^card-zs5v
process instead, and ==blocked== when it cannot run until some event ^card-g1h4
(such as an I/O completion) occurs, even if a CPU is free.

Why can't a blocked process simply be given the CPU when it becomes the highest-priority job? :: A blocked process is waiting on an event outside the CPU's control (e.g., a disk read); running it would not make progress, so the OS leaves it off the ready pool until the event fires and moves it to ready. ^card-0ifj

On UNIX, a new process is created with a pair of calls rather than one.
`fork()` creates a nearly-identical copy of the calling process — same
code, a copy of the address space, same open files — and returns
control to both the original (parent) and the new copy (child) at the
point right after the call. The two copies are told apart by fork's
return value.

Why does fork() return a different value in the parent than in the child? :: fork() returns the child's process ID to the parent and 0 to the child, so the same post-fork code can branch on the return value to run different logic in each process even though both start from the identical point in the program. ^card-cb78

`exec()` is the second half of the pair: it replaces the calling
process's code and address space with those of a new program, without
creating a new process (same PID, same open file descriptors).

Why split process creation into fork() then exec() instead of one spawn call? :: Splitting them lets the shell run code between the fork and the exec, in the child only — for example redirecting a file descriptor or setting up a pipe — before the child's image is replaced by the target program, which a single combined call could not support. ^card-hczt

```
// example only, not a code listing to memorize verbatim
pid_t pid = fork();
if (pid == 0) {
    // child: could redirect fds here before exec
    execvp("ls", args);
} else {
    // parent
    wait(NULL);
}
```

> [!card] mcq
> A parent calls `wait()` right after `fork()`. What is the parent waiting for?
> - [ ] The child to call exec()
> - [x] The child to terminate, so the parent can reap its exit status
> - [ ] The scheduler to grant the parent another time slice
> - [ ] The child to release its file descriptors ^card-4p96

> [!card] recall
> Explain why an OS needs `wait()` at all — what would go wrong for the
> parent, or for the system's process table, if a parent never collected a
> terminated child's exit status? ^card-xox5

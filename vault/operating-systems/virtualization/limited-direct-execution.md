---
category: os-virtualization
tags: [limited-direct-execution, traps, mode-switch, system-calls]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 6 (Limited Direct Execution)"]
---

# Limited Direct Execution

The OS wants two contradictory things at once: processes should run at
full hardware speed (no interpreter layer in the middle), yet the OS must
stay in control so a process can't do whatever it wants — read another
process's memory, hog the CPU forever, or touch a disk directly. Limited
direct execution (LDE) is the technique that gets both: run the program
directly on the CPU, but limit what it can do using hardware support.

The hardware provides two privilege levels. In ==user mode==, code cannot ^card-zjlo
directly issue privileged instructions (like ones that touch disk or
reconfigure the MMU) — attempting one causes the hardware to trap into
the OS instead. In ==kernel mode==, the OS itself runs with full access ^card-ohmn
to the hardware. A process's normal code always runs at that lower
privilege level.

How does a user-mode process ask the OS to perform a privileged operation, such as reading a file? :: It executes a system call, a special trap instruction; the trap saves the caller's register state and jumps to a fixed, OS-defined entry point in kernel mode, so the process cannot jump into arbitrary kernel code, only through the sanctioned entry. ^card-wh1e

The set of valid trap entry points is called the trap table, and it is
set up once, at boot time, by the OS running in kernel mode — a user
process is never allowed to change where traps land, because that would
let it redirect a trap to code of its own choosing and escape the
limits.

Why must only the OS be allowed to configure the trap table, and never a user process? :: If a user process could set the trap handler address, it could point a system call trap at its own code and have that code run with full kernel privilege, defeating the entire protection scheme. ^card-pryn

A single trap into the kernel isn't enough to keep control forever,
though — a process could simply never make a system call and monopolize
the CPU. The classic fix is a ==timer interrupt==: hardware raises an ^card-amid
interrupt at a fixed interval regardless of what the process is doing,
forcing a trap back into the OS, which can then decide whether to keep
running this process or switch to another. This is what makes
preemptive scheduling possible without cooperation from the program
being interrupted.

> [!card] mcq
> A process is running an infinite loop with no system calls and no I/O. What lets the OS regain control of the CPU?
> - [ ] The process's next system call
> - [ ] The scheduler polling the process's state
> - [x] A periodic timer interrupt forcing a trap into the OS
> - [ ] The compiler inserting yield calls automatically ^card-mm2u

On a context switch, the OS must save the currently-running process's
register state (into that process's process control block) and restore
the register state of the process it is switching to, before returning
from the trap — the return-from-trap instruction then resumes execution,
but as a different process than the one that trapped in.

Why does "return-from-trap" not necessarily resume the same process that trapped into the kernel? :: Between the trap and the return, the OS's scheduler is free to swap in a different process's saved register state, so the trap and the eventual return-from-trap can belong to two different processes even though they are the same hardware instruction pair. ^card-qh6j

> [!card] recall
> Explain why direct execution alone (running a program straight on the CPU
> with no traps or timer interrupts) is unsafe for a multiprogrammed OS,
> even though it is the fastest possible way to run code. ^card-efqj

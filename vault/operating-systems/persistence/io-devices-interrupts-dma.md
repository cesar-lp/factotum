---
topic: operating-systems
category: os-persistence
tags: [io-devices, interrupts, polling, dma]
citations: ["Arpaci-Dusseau, OSTEP, Ch. 36 (I/O Devices)"]
---

# I/O Devices, Interrupts, and DMA (Direct Memory Access)

A device typically exposes a small set of registers — status, command, and
data — that the OS reads and writes to drive it. This canonical protocol
repeats across very different devices (disks, network cards, keyboards),
which is why a common interaction pattern shows up throughout the OS's
device-handling code, not just in one driver.

The simplest way to drive a device is ==polling==: repeatedly read the ^card-cfps
status register in a loop until it reports the device is ready. That's
simple but wastes CPU cycles spinning while a slow device does its work.

Why do fast devices sometimes perform better with polling than with interrupts? :: An interrupt costs a context switch and trap-handling overhead; if a device usually finishes before that overhead would even be paid, briefly polling is cheaper than triggering, delivering, and dispatching an interrupt for a result that was already ready by the time it arrived. ^card-1j36

On completion, a slower device instead raises ==an interrupt==, a hardware ^card-vnsi
signal that traps the CPU into a pre-registered handler, letting the CPU
run other work while waiting rather than spinning on a status register.

Why do high-throughput devices batch interrupts instead of firing one each? :: Interrupt handling carries a fixed per-interrupt cost (trap, register save, handler dispatch), so coalescing many completed operations into one interrupt amortizes that fixed cost across all of them, at the price of delaying notification for whichever operation finished first. ^card-4msq

Some drivers switch strategies dynamically: poll briefly first, since the
device might finish almost immediately, and only fall back to interrupts
if it doesn't — a hybrid that avoids both wasted spinning and needless
interrupt overhead depending on measured load.

Without ==DMA==, the CPU itself must copy every ^card-0c25
byte of a large transfer between a device and memory through the data
register, one word at a time — wasteful for anything beyond a few bytes.

What does a DMA controller let the CPU skip during a large data transfer? :: The OS hands the DMA controller a source, destination, and length, and the controller moves the data between device and memory on its own, interrupting the CPU only once when the whole transfer completes rather than once per word copied. ^card-kn62

> [!card] mcq
> A disk request takes 5ms to complete, and handling an interrupt costs about 2 microseconds of overhead. Which approach best uses the CPU while waiting?
> - [x] Interrupt-driven waiting, so the CPU can run other work during the 5ms
> - [ ] Busy-wait polling, since 5ms is a short amount of time
> - [ ] DMA instead of interrupts, since DMA replaces interrupt-driven waiting entirely
> - [ ] Disabling the device driver until the device signals readiness on its own ^card-o8sb

> [!card] recall
> Explain why polling and interrupts are not mutually exclusive strategies,
> and why a driver might deliberately poll for a short window before
> arming an interrupt instead of committing to one approach. ^card-sz2h

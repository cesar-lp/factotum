---
topic: physics
category: physics-mechanics
tags: [energy-conservation, mechanical-energy, power, friction]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 8"]
---

# Conservation of energy and power

`work-and-the-work-energy-theorem.md` gives `W_net = Delta(KE)`, and
`potential-energy-and-conservative-forces.md` defines potential energy for
conservative forces. This note combines the two into a single conserved
quantity, states the one condition that quantity depends on, and then adds
a second idea, power, that conservation says nothing about.

**Mechanical energy**, `KE + PE`, is conserved — constant over time — but
only under one hypothesis: no non-conservative force does work on the
system. The instant a non-conservative force like friction or air drag
does nonzero work, plain `KE + PE = constant` is false, and using it
anyway is the single most common error in this topic.

```
KE + PE = constant                    (only if W_nonconservative = 0)
KE_f + PE_f = KE_i + PE_i + W_nc      (general form, any case)
```

> [!card] recall
> State the mechanical energy conservation law together with the
> condition under which it holds.
> ---
> KE + PE = constant, but only when no non-conservative force does work
> on the system. In general, KE_f + PE_f = KE_i + PE_i + W_nc, where
> W_nc is the work done by non-conservative forces. ^card-au7a

> [!card] mcq
> A block slides down a ramp with friction. Which statement about its
> mechanical energy is correct?
> - [x] Mechanical energy is not conserved — friction does negative work, so KE + PE decreases
> - [ ] Mechanical energy is conserved, since gravity is still conservative
> - [ ] Mechanical energy is conserved as long as PE is measured from the bottom of the ramp
> - [ ] Mechanical energy increases, since the block speeds up ^card-keop

When can KE + PE = constant be applied to a system, and what condition invalidates it? :: It applies exactly when no non-conservative force does work on the system over the interval considered — commonly true for gravity and springs alone. It is invalidated the moment friction, air drag, or an applied external force does nonzero work, since that work adds or removes energy from the KE + PE total rather than merely converting between its two forms. ^card-j1o9

Why is conservation often faster than tracking forces directly? Because it
relates two configurations — a start and an end state — without needing
to know anything about the path connecting them. A ball rolling down any
frictionless track of a given height arrives at the bottom with the same
speed regardless of the track's shape, because `PE = m*g*h` only depends
on height, not on the geometry of the descent — a fact that would take
integrating a force along an arbitrary curve to establish any other way.

A ball rolls down each of three differently shaped frictionless ramps, all starting at the same height and ending at the same lower height. How do their speeds at the bottom compare? :: They are all equal. Mechanical energy conservation only relates the initial and final heights (through PE = m*g*h), never the shape of the path between them, so any frictionless track connecting the same two heights produces the same final speed. ^card-y5vw

Friction does not destroy energy — that would violate a far broader
conservation law than the mechanical one. What friction does is convert
mechanical energy into ==thermal== energy (and sometimes sound), which is ^card-snzg
exactly why the general form above needs a `W_nc` term rather than energy
simply vanishing: the "lost" mechanical energy is accounted for, just not
as `KE + PE` anymore.

Power is the rate at which energy is transferred or work is done:

```
P = W/t
P = F*v          (instantaneous power, force along velocity)
```

measured in watts, where:

```
W = J/s
```

Power answers a question conservation of energy is silent on. Energy
conservation tells you whether a given transfer of energy is possible at
all; power tells you how fast it can happen. Two engines can do the exact
same total work lifting the same load the same height — using, therefore,
identical amounts of energy — while one takes ten times longer, because it
delivers a tenth of the power.

> [!card] mcq
> Two motors each lift an identical 1000 kg load to the same height, doing
> the same total work. Motor A finishes in 5 seconds; Motor B takes 50
> seconds. What can you conclude?
> - [x] Motor A delivers ten times the power of Motor B, even though both do the same total work
> - [ ] Motor A does ten times more work than Motor B
> - [ ] The two motors are equivalent, since power is just another name for work
> - [ ] Motor B is more efficient, since it uses energy more slowly ^card-oso7

What distinguishes "how much energy a task requires" from "how much power a task requires"? :: Energy (or total work) is fixed by the task itself — the mass moved and the height or distance involved — regardless of how quickly it happens. Power is the rate at which that fixed amount of energy is delivered, so the same task can be done by a low-power source taking a long time or a high-power source taking a short time, with the energy requirement unchanged either way. ^card-52if

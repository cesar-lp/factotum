---
topic: physics
category: physics-mechanics
tags: [collisions, momentum, kinetic-energy, restitution]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 9"]
---

# Collisions: elastic and inelastic

`momentum-and-impulse.md` established that momentum is conserved in
every collision while kinetic energy is not. This note is about what
that split buys you: a two-way classification of collisions by what
survives them, and the algebra that follows from each case.

**Momentum is conserved in every collision**, full stop — that followed
from Newton's third law alone and needs no further hypothesis. The
label "elastic" or "inelastic" never describes momentum; it describes
only whether **kinetic energy** also survives. That distinction is the
one thing this note has to drill, because it is also the one most often
gotten backwards.

> [!card] mcq
> A ball of putty is thrown at a wall and sticks — a perfectly inelastic
> collision. Which quantity, if any, is conserved during the impact?
> - [x] Momentum of the ball-wall(-Earth) system, but not kinetic energy
> - [ ] Kinetic energy, but not momentum
> - [ ] Both momentum and kinetic energy
> - [ ] Neither — "inelastic" means nothing is conserved ^card-0o0j

An **elastic** collision conserves both momentum and kinetic energy — no
internal deformation, heat, or sound absorbs any of it. Real macroscopic
collisions only approximate this (billiard balls, hard spheres), but
atomic and subatomic collisions can be elastic to very high precision.

A **perfectly inelastic** collision is the opposite extreme: the bodies
==stick together== and move off with one common velocity afterward. ^card-onp8

Momentum conservation alone fixes that common velocity:

```
m1*v1 + m2*v2 = (m1 + m2)*v_f
```

Sticking together is not just *an* inelastic case — it is the case of
**maximum** possible kinetic energy loss consistent with momentum
conservation. Any other post-collision outcome that still conserves the
same total momentum splits it across two different final velocities
instead of one shared velocity, and spreading a fixed total momentum
across two velocities rather than forcing them equal always leaves more
kinetic energy in the system, not less.

Why is a perfectly inelastic collision, where the bodies stick together, the case of *maximum* kinetic energy loss rather than some intermediate case? :: Momentum conservation fixes the total momentum after the collision, but not how it's divided between the bodies. Sticking together removes every degree of freedom in the final velocities except the one shared value momentum conservation forces on them, leaving the least kinetic energy any momentum-conserving outcome can have; any relative motion left over after the collision only adds kinetic energy on top of that minimum. ^card-piry

For a general one-dimensional elastic collision, both conservation laws
hold simultaneously and can be solved for the final velocities:

```
m1*v1 + m2*v2 = m1*v1' + m2*v2'                 (momentum)
(1/2)*m1*v1^2 + (1/2)*m2*v2^2
    = (1/2)*m1*v1'^2 + (1/2)*m2*v2'^2            (KE)
```

The **equal-mass** elastic case is worth memorizing on its own, because
its result is so clean: when `m1 = m2`, solving the pair above gives
`v1' = v2` and `v2' = v1` — the two bodies simply ==exchange velocities==. ^card-6dgn

A moving billiard ball striking an identical stationary one elastically
stops dead, handing off all its velocity to the other.

> [!card] recall
> Derive, or at least justify without re-deriving the algebra, why two
> equal-mass bodies in a one-dimensional elastic collision exchange
> velocities rather than ending up with some other pair of final speeds.
> ---
> With `m1 = m2 = m`, the momentum equation becomes `v1 + v2 = v1' + v2'`
> and the kinetic energy equation becomes `v1^2 + v2^2 = v1'^2 + v2'^2`.
> The pair `v1' = v2, v2' = v1` satisfies both trivially (it just swaps
> the two terms in each sum), and because two equations in two unknowns
> pin down the solution (excluding the trivial no-collision case
> `v1'=v1, v2'=v2`), that swap is the unique physical outcome. ^card-txzn

Between the two extremes, the **coefficient of restitution** `e`
measures how elastic an actual collision is, as the ratio of relative
speed after to relative speed before:

```
e = (v2' - v1') / (v1 - v2)
```

`e = 1` recovers the elastic case; `e = 0` recovers perfectly inelastic
(the bodies have zero relative speed afterward — they move together).
Most real collisions fall strictly between, `0 < e < 1`.

What does a measured coefficient of restitution of `e = 0.6` tell you about a collision, and what would `e = 0` and `e = 1` each mean physically? :: `e = 0.6` means the bodies separate afterward at 60% of the relative speed they approached with — some kinetic energy was lost, but they did not stick. `e = 1` means they separate at the same relative speed they approached with (no kinetic energy lost — elastic). `e = 0` means the relative speed afterward is zero — the bodies move off together, which is the perfectly inelastic case. ^card-kp4v

> [!card] mcq
> A dropped ball bounces back to exactly the height it was dropped from,
> over and over. What does this imply about its coefficient of
> restitution with the floor, and about the collision type?
> - [x] e = 1 — no kinetic energy is lost on each bounce, so the collision is (effectively) elastic
> - [ ] e = 0 — the ball is undergoing a perfectly inelastic collision each bounce
> - [ ] e = 1 — but this says nothing about whether energy is conserved
> - [ ] The coefficient of restitution cannot be determined from bounce height alone ^card-80rc

An inelastic collision's "lost" kinetic energy is never destroyed — it
converts into deformation of the colliding bodies, heat, and sound, so
total energy is conserved throughout exactly as it always is; what is
not conserved is specifically the *kinetic* piece of it. In the
two-body centre-of-mass frame, an elastic collision has an even simpler
description: the bodies' speeds relative to the centre of mass are
unchanged, only their directions reverse.

If a car crash's crumpling is measured to dissipate 40,000 J as heat, sound, and permanent deformation, has the collision violated conservation of energy? :: No. Conservation of energy always holds; what is not conserved in an inelastic collision is specifically kinetic energy. The 40,000 J did not vanish — it converted into other forms (deformation, heat, sound), so the total energy of the system, counting those forms, is exactly what it was before the crash. ^card-6gyb

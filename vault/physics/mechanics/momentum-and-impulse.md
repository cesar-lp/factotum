---
topic: physics
category: physics-mechanics
tags: [momentum, impulse, newtons-second-law, conservation-laws]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 9"]
---

# Momentum and impulse

`newtons-laws-and-free-body-diagrams.md` and `work-and-the-work-energy-theorem.md`
give you two ways to track a system: force and acceleration, or work and
energy. This note adds a third quantity, momentum, and the reason it
earns its own bookkeeping rather than being folded into either of the
others: it is the one quantity that stays conserved even while kinetic
energy does not, which is exactly what makes note 9's collision analysis
possible.

Momentum is a vector, the product of mass and velocity:

```
p = m*v          [kg*m/s]
```

It points the same direction as velocity, and doubling either the mass
or the speed doubles it.

Newton's second law, as Newton actually stated it, is a law about
momentum, not acceleration:

```
F_net = dp/dt
```

`F = m*a` is the special case of this law that holds only under the
hypothesis of ==constant mass== — differentiate `p = m*v` with constant ^card-9vjc
`m` and the mass falls out of the derivative, leaving
`F = m*(dv/dt) = m*a`. The general form is what you need whenever mass
changes during the motion, such as a rocket burning fuel or a raindrop
accreting water as it falls.

Why does `F_net = dp/dt` reduce to `F = m*a` for a rocket only before it starts burning fuel, and not during the burn? :: During the burn, mass is changing with time, so `dp/dt = d(m*v)/dt` expands by the product rule into `m*(dv/dt) + v*(dm/dt)` — a second term that vanishes only when `dm/dt = 0`. `F = m*a` silently drops that term, so applying it to a rocket mid-burn omits the thrust contribution from expelled mass and gets the dynamics wrong. ^card-k9vt

Integrating `F_net = dp/dt` over the time a force acts gives the
**impulse-momentum theorem**: a net force applied for a duration produces
a change in momentum equal to the impulse delivered.

```
J = F*Δt = Δp        [kg*m/s, equivalently N*s]
```

For a fixed `Δp` — say, a body's momentum going to zero on impact — `J`
is fixed too, so `F` and `Δt` trade off against each other: stretching
out the collision time lowers the peak force needed to produce the same
change in momentum. That single relationship is the entire physics
behind airbags, crumple zones, catching a fast ball with a give in your
arm, and bending your knees on landing — none of them reduce how much
momentum has to change, all of them buy more time to change it in.

> [!card] recall
> A car crashes into a rigid wall versus into a crumple-zone barrier that
> brings it to rest over a longer distance and time, losing the same
> amount of momentum either way. Explain, from the impulse-momentum
> theorem, why the occupant experiences a smaller peak force in the
> second case.
> ---
> Both cases deliver the same impulse `J = Δp`, since the car loses the
> same momentum either way. `J = F*Δt`, so for fixed `J`, force and time
> are inversely related: stretching the stopping time over the crumple
> zone's longer deceleration means a smaller average force is needed to
> produce that same `Δp`. The rigid wall delivers the same momentum
> change almost instantly, forcing `F` to be much larger. ^card-j3ni

For a system of bodies, Newton's third law makes every internal
interaction cancel: whatever momentum one body loses to another inside
the system, the other gains, so those forces contribute nothing to the
system's total momentum change. What's left is only the **net external**
force on the system as a whole.

```
F_ext,net = dp_total/dt
```

**Conservation of momentum** is the case `F_ext,net = 0`: an isolated
system's total momentum is constant. This is why momentum is conserved
in a collision even though the colliding bodies exert forces on each
other large enough to crumple metal — those forces are internal to the
system of "both cars," and by Newton's third law they cancel exactly in
the sum, leaving the external forces (which, over the short duration of
a collision, are usually negligible) as the only thing that could change
the total.

> [!card] mcq
> Two skaters push off each other on frictionless ice. Why is the total
> momentum of the two-skater system conserved during the push?
> - [x] The push is an internal force pair; by Newton's third law the two forces are equal and opposite, so they cancel in the system's total momentum, and there is no net external horizontal force
> - [ ] Because each skater's individual momentum is conserved separately
> - [ ] Because the push forces are too small to matter
> - [ ] Because kinetic energy is conserved in the push, and momentum follows from that ^card-31bl

Momentum conservation holds in every collision, elastic or not, because
it depends only on there being no net external force — a condition about
forces, not about what kind of collision occurs. Kinetic energy has no
such guarantee: it is conserved only when the internal forces do no net
work over the interaction, which is a much stronger requirement that
ordinary collisions (crumpling, sticking, heating) generally violate.
Note 9 works out exactly which collisions keep kinetic energy and which
don't, and what happens to the energy that's "lost."

Why is momentum conserved in essentially every collision, while kinetic energy is conserved only in special ones? :: Momentum conservation follows just from Newton's third law canceling internal forces in the total, given no net external force — true regardless of how the bodies interact. Kinetic energy conservation additionally requires the internal forces to do zero net work on the system, which fails whenever a collision deforms, heats, or otherwise dissipates energy internally; that is a much more restrictive condition. ^card-gzre

Momentum's directionality matters in practice: it is a ==vector==, so two ^card-y8dy
equal-mass bodies moving toward each other at the same speed have equal
and opposite momenta that sum to zero, even though neither one's speed
is zero. Treating momentum as if it were speed — summing magnitudes
instead of components — is a common setup error in collision problems.

In a real car crash, why is treating "momentum before" and "momentum after" as conserved a good approximation, even though the road exerts friction (an external force) on the cars throughout? :: Conservation strictly requires zero net external force, but the collision itself happens over a very short time compared to the impulse the collision forces deliver. Friction from the road acts the whole time but is comparatively small, so the external impulse it contributes over the brief collision window is negligible next to the internal collision forces — momentum is conserved to good approximation during the collision itself, even though it is not conserved over the whole longer process of skidding to a stop afterward. ^card-b1p3

> [!card] mcq
> A garden hose sprays water at constant mass flow rate and constant
> speed against a wall, where it stops. Which form of Newton's second
> law correctly gives the force the water exerts on the wall?
> - [x] F_net = dp/dt, evaluated using the rate at which momentum arrives, since the mass of water interacting with the wall is continuously changing, not fixed
> - [ ] F = m*a, treating the total mass of water sprayed as a single accelerating object
> - [ ] Neither applies, because the water's speed never changes
> - [ ] F = m*a, using the wall's own mass ^card-cf7n

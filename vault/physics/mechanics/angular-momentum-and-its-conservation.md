---
topic: physics
category: physics-mechanics
tags: [angular-momentum, conservation-laws, torque, central-forces]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 11"]
---

# Angular momentum and its conservation

`momentum-and-impulse.md` conserved ordinary (linear) momentum under one
hypothesis: no net external force. `torque-and-rotational-dynamics.md`
built the rotational analogue of force. This note puts the two together:
the rotational analogue of momentum, and a conservation law with a
different hypothesis that is easy to confuse with the linear one.

For a rigid body rotating about a fixed axis, angular momentum is:

$$
L = I\omega \qquad [\mathrm{kg \cdot m^2/s}]
$$

For a single particle, the more general definition is:

$$
L = r \times p = m(r \times v) \qquad [\mathrm{kg \cdot m^2/s}]
$$

where $r$ is the particle's position relative to the chosen origin and
$p$ its linear momentum. The rigid-body form is the special case you get
by summing $r_i \times p_i$ over every mass element of a body rotating
rigidly about an axis through that origin.

`vault/math/linear-algebra/cross-product-and-oriented-area.md` covers
what the cross product itself does; this note only uses it, the same way
the torque note did for $r \times F$.

Differentiating $L$ with respect to time gives the rotational analogue
of $F_{net} = dp/dt$:

$$
\tau_{net} = \frac{dL}{dt}
$$

**Conservation of angular momentum** is the case $\tau_{net} = 0$: if no net
external torque acts on a system, its total angular momentum is
constant. The hypothesis is torque, not force — and that is a genuinely
different condition from the one that conserves linear momentum, not
just a rotational restatement of it. A body can have zero net torque
about some axis while still having a nonzero net force acting on it
(a force aimed straight at the axis contributes no torque, as the lever
arm note already showed, but it still changes linear momentum). The
reverse is also possible: a force pair with zero net force can still
produce a nonzero net torque, if the two forces are offset rather than
collinear — an effect specific enough to have its own name, a **couple**.
Treating "no net torque" and "no net force" as the same condition is the
standard error this note exists to prevent.

> [!card] mcq
> A rigid body has zero net external torque about its center of mass but
> a nonzero net external force acting on it. What can you conclude?
> - [x] Its angular momentum about the center of mass is conserved, but its linear momentum is not — the two conservation laws have independent hypotheses (net torque vs. net force)
> - [ ] Neither angular nor linear momentum is conserved, since a net force must produce a net torque
> - [ ] Both are conserved, since the body is rigid
> - [ ] This situation is physically impossible ^card-pzz6

Why is it possible for a system to have zero net external torque about some axis while still having a nonzero net external force acting on it? :: Torque depends on both the force and the lever arm — where the force is applied relative to the axis, through $rF\sin(\theta)$. A force whose line of action passes through the axis (zero lever arm, or $\theta = 0$) contributes zero torque about that axis regardless of its magnitude, yet it still contributes fully to the net force and would still change linear momentum. The two conservation laws are governed by genuinely different quantities. ^card-0e9d

The **spinning skater** pulling their arms in is the canonical
demonstration, and the mechanism is precise, not just qualitative:
pulling the arms inward decreases the ==moment of inertia==, and since no ^card-5oal
external torque acts (ignoring the small friction at the skate blades),
$L = I\omega$ must stay constant, so $\omega$ has to increase to
compensate.

> [!card] recall
> A skater spinning with arms outstretched pulls them in. Using
> $L = I\omega$, explain why the skater's angular velocity increases, and
> then explain what happens to the skater's rotational kinetic energy —
> and where that energy comes from or goes.
> ---
> Pulling the arms in decreases I (mass moves closer to the rotation
> axis). With no external torque, L = I*omega is constant, so a smaller I
> forces a larger omega. Rotational kinetic energy, (1/2)*I*omega^2, is
> not conserved here — it actually *increases*, because omega grows
> faster (as 1/I) than I shrinks. That extra energy isn't free: it comes
> from the mechanical work the skater's muscles do pulling the arms
> inward against the outward (centrifugal, in the rotating frame)
> tendency of the arms to stay out — angular momentum conservation says
> nothing about energy, only about L itself. ^card-q2ma

That kinetic energy *increase* is the part of the skater example usually
left out, and it is worth stating on its own: conserving $L$ never
implies conserving $KE_{rot}$ — they are governed by different physics
(torque versus work), and the skater case is a clean example where one
is held fixed while the other visibly changes.

Does an isolated system's angular momentum being conserved imply its rotational kinetic energy is also conserved? :: No. Angular momentum conservation follows from zero net external torque; kinetic energy is a completely separate bookkeeping that changes whenever any work is done, including internal work like a skater's muscles pulling their arms inward. The skater's KE_rot visibly increases even while L stays exactly fixed, showing the two are governed by unrelated conditions. ^card-urp1

Angular momentum is a vector, $L = I\omega$ pointing along the rotation
axis by the right-hand rule, and this vector nature is why a rapidly
spinning object — a bicycle wheel, a gyroscope — resists having its
rotation axis reoriented: changing $L$'s *direction* requires a torque
just as changing its magnitude does, via $\tau_{net} = dL/dt$ read as a
vector equation. Apply a torque perpendicular to a spinning wheel's $L$
(trying to tip its axis over) and instead of tipping the way you pushed,
the axis slowly sweeps sideways instead — a phenomenon called
==precession== — because $dL/dt$ points in the direction of the applied ^card-m897
torque, not in the direction you tried to rotate the wheel.

> [!card] mcq
> You try to tip over the axis of a fast-spinning gyroscope by pushing
> straight down on one end of its axle. What actually happens?
> - [x] The axle sweeps sideways (precesses) instead of tipping down, because dL/dt points along the applied torque's direction, which is sideways, not along the push
> - [ ] The axle tips down exactly as pushed, since torque directly rotates the object about the torque's axis of application
> - [ ] Nothing happens, since a spinning gyroscope is immune to external torques
> - [ ] The gyroscope stops spinning ^card-ege1

Angular momentum conservation also governs orbits: a planet's angular
momentum about the sun is conserved because gravity is a **central
force** — it always points along the line connecting planet and sun, so
its lever arm about the sun is exactly zero and it exerts no torque
about that point. This is the mechanical content of Kepler's second law
(equal areas in equal times): as the planet nears the sun and speeds up,
$r$ shrinks while $v$ grows to keep $r \times p$ constant, exactly the
skater's $I$ and $\omega$ trading off to keep $L$ fixed.

Why does a planet speed up as it approaches the sun in its elliptical orbit, in terms of angular momentum? :: Gravity is a central force, always directed along the line to the sun, so it produces zero torque about the sun and the planet's angular momentum $L = r \times p$ about the sun is conserved throughout the orbit. As the planet's distance $r$ from the sun decreases near perihelion, conserving $L = mrv_{perp}$ requires the tangential speed to increase to compensate — the same $I\omega$ trade-off as the spinning skater, with $r$ playing the role of the lever arm. ^card-vi6w

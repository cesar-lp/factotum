---
topic: physics
category: physics-mechanics
tags: [potential-energy, conservative-forces, gravity, springs]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 8"]
---

# Potential energy and conservative forces

`work-and-the-work-energy-theorem.md` treats work as something you compute
along a specific path. This note asks when that computation stops caring
about the path at all — and shows that the answer to that question is the
entire reason "potential energy" is a coherent idea rather than a
convenient fiction.

A force is **conservative** if the work it does on an object moving between
two points does not depend on the path taken between them — equivalently,
if the work it does around any closed loop is zero. Gravity and the spring
force are conservative; kinetic friction is not.

That path-independence is not just a nice property — it is the condition
that makes it possible to define a potential energy in the first place.
If a force's work depended on the path, then "the energy stored by being
at this position" would be ambiguous: an object at a given point could be
assigned a different stored energy depending on how it got there, and the
whole idea of energy as a function of position would fall apart. A
potential energy function $U$ can be defined only because a conservative
force's work depends solely on the endpoints, letting you assign a single
number to each position.

> [!card] mcq
> What property of a force is *equivalent* to it being conservative, and
> therefore to a potential energy being definable for it at all?
> - [x] The work it does around any closed path is zero
> - [ ] It always points toward a single fixed center
> - [ ] It never does negative work
> - [ ] Its magnitude never depends on position ^card-tjb0

Why does path-independence of work matter enough to be the defining property of a conservative force, rather than just an incidental fact about gravity and springs? :: Because it is exactly what allows "potential energy at a point" to be well-defined. If work depended on the path taken to reach a point, the energy assigned to that point would depend on history rather than position, so no single-valued function of position could represent it. Path-independence is what lets the force's work be captured entirely by a function U(position). ^card-enpl

Two conservative forces near Earth's surface get standard forms:

$$
\begin{aligned}
PE_{grav} &= mgh \\
PE_{spring} &= \tfrac{1}{2}kx^2
\end{aligned}
$$

both measured in joules. $h$ is height above whatever point you call
$h = 0$, and $x$ is a spring's displacement from its unstretched length.

> [!card] recall
> Write the standard forms of gravitational potential energy near Earth's
> surface and elastic potential energy of an ideal spring, and give the
> units.
> ---
> PE_grav = m*g*h and PE_spring = (1/2)*k*x^2, both in joules (J). h is
> height above a chosen reference, and x is the spring's displacement
> from its unstretched length. ^card-3x4l

Nothing in physics tells you where to put $h = 0$, and nothing needs to —
only ==changes== in potential energy between two configurations produce a ^card-ex3n
force or do work; the reference point is a free choice that cancels out
of every physical prediction. This is exactly why a negative potential
energy (an object below your chosen $h = 0$) is not a sign of an error: it
just means that position sits below the arbitrary reference, not below
some absolute floor of energy.

A satellite orbit calculation defines gravitational potential energy as ^card-nife
zero at infinite separation, making PE negative everywhere a bound orbit
exists. What does that negative value indicate? :: Nothing physically alarming — it only reflects the chosen reference point (zero at infinite separation), which puts every bound configuration, being closer than infinite separation, below that reference. Only differences in PE between two configurations are physical; the value at any single point depends entirely on where the zero was placed.

Potential energy and force are two descriptions of the same conservative
interaction, related by:

$$
F = -\frac{dU}{dx}
$$

The minus sign is the content of the relation: force points in the
direction that decreases potential energy fastest — "downhill." A ball on
a hill, a stretched spring, and a satellite in orbit all accelerate toward
lower potential energy, never higher, which is what this equation states
in one line rather than three separate facts about three separate systems.

In more than one dimension, $-dU/dx$ generalizes to the gradient of $U$,
covered as a mathematical object in `vault/math/multivariable/`; this note
only uses the one-dimensional case.

> [!card] recall
> State the relation between a conservative force and its potential
> energy function in one dimension, and explain what the sign means
> physically.
> ---
> F = -dU/dx. The negative sign means the force points in the direction
> of decreasing potential energy — toward lower U, not higher — so an
> object under a conservative force alone always accelerates "downhill"
> in its potential energy. ^card-hvza

Not every force has a potential energy function. Kinetic friction is the
standard example of a **non-conservative** force: the work it does on an
object depends on the length of the path traveled, not just the start and
end points — sliding a box in a large circle back to its starting point
costs real energy to friction, unlike gravity or a spring, which return
that energy exactly. Since friction's work is not path-independent, no
function of position alone can capture it, and no potential energy for
friction exists.

> [!card] mcq
> An object slides from point A to point B twice: once along a short
> straight path, once along a long looping path, both on a floor with
> kinetic friction. How does the work done by friction compare?
> - [x] It is different (more negative) on the longer path, because friction's work depends on path length, not just the endpoints
> - [ ] It is identical on both paths, because friction always does the same total work between two fixed endpoints
> - [ ] It is zero on both paths, since friction is a contact force
> - [ ] It is positive on the longer path and negative on the shorter one ^card-4elz

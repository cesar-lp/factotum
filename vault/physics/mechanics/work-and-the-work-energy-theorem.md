---
topic: physics
category: physics-mechanics
tags: [work, energy, work-energy-theorem, kinetic-energy]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 7"]
---

# Work and the work-energy theorem

`newtons-laws-and-free-body-diagrams.md` and `circular-motion-and-centripetal-force.md`
give you force as a vector you resolve into components. This note gives you
a second, entirely different way to reason about the same situations —
force reduced to a single scalar number, work — and shows why that trade
is often worth making.

For a constant force acting over a straight-line displacement, work is:

$$
W = Fd\cos(\theta)
$$

where $\theta$ is the angle between the force vector and the displacement
vector, and $d$ is the displacement's magnitude. $\theta$ is not decoration
— it is the entire content of the definition. Only the component of force
**along** the direction of motion does work; the component perpendicular
to the motion contributes nothing, because $\cos(90^\circ) = 0$.

That single fact explains two results that otherwise look like separate
rules to memorize: the normal force on a block sliding across a floor does
zero work, because it is always perpendicular to the sliding; and the
centripetal force holding a satellite in circular orbit does zero work,
because it always points radially, perpendicular to the orbital velocity.
Neither force ever speeds the object up or slows it down, which is exactly
what "zero work" predicts.

> [!card] mcq
> A block slides across a rough horizontal floor. Which force acting on it
> does zero work as it slides?
> - [x] The normal force, because it is always perpendicular to the block's displacement
> - [ ] Friction, because it always opposes the motion
> - [ ] Gravity, because the block is on a horizontal surface
> - [ ] The applied force pushing the block forward ^card-r5eu

Why does a force perpendicular to an object's displacement do zero work on it, regardless of how large that force is? :: Work depends on the component of force along the direction of motion, $F\cos(\theta)$. A perpendicular force has $\theta = 90$ degrees, so $\cos(\theta) = 0$ no matter how large the force's magnitude is — it can change the object's direction (as centripetal force does) without ever adding or removing energy. ^card-aem5

Work is a ==scalar==, not a vector, and unlike distance or speed it can be ^card-50gk
negative: a force with a component opposite the displacement does negative
work. Kinetic friction is the standard case — it always points opposite
the direction of sliding, so it always removes energy from whatever is
moving, never adds it.

> [!card] mcq
> Kinetic friction acts on a block sliding across a floor. What is true
> about the work it does on the block?
> - [x] It is negative, because friction always points opposite the block's direction of motion
> - [ ] It is zero, because friction is a contact force rather than a field force
> - [ ] It is positive, because friction opposes the block's acceleration
> - [ ] Its sign depends on the block's mass ^card-ekbn

When the force varies over the path — a spring, gravity along a curved
path, anything not constant — work is the integral of the force along the
path:

$$
\begin{aligned}
W &= \int F\, dx \quad \text{(one dimension)} \\
W &= \int F \cdot dr \quad \text{(general path, dot product with displacement)}
\end{aligned}
$$

Units of work are joules, and one joule is exactly the work done by one
newton acting over one meter in the direction of motion:

$$
\mathrm{J} = \mathrm{N} \cdot \mathrm{m}
$$

All of that machinery earns its keep through one theorem. The **work-energy
theorem** states that the net work done on an object by all forces equals
its change in kinetic energy:

$$
W_{net} = KE_{final} - KE_{initial} = \Delta(KE)
$$

> [!card] recall
> State the work-energy theorem, and explain why it lets you find a
> final speed without ever solving for the time the motion took.
> ---
> W_net = ΔKE — the net work done on an object equals its change in
> kinetic energy. Because it relates force (through work) directly to
> speed, with time eliminated from the equation entirely, a problem that
> would require solving a differential equation or a multi-step kinematics
> chain for the time variable collapses to one algebraic line: compute the
> net work, set it equal to ΔKE, and solve for the unknown speed. ^card-m7ip

Kinetic energy itself is:

$$
KE = \tfrac{1}{2}mv^2
$$

The $v^2$ dependence is not a minor detail — it is why braking distance
grows the way it does. Doubling an object's speed quadruples its kinetic
energy, so a car that needs a given amount of negative work from its
brakes and tires to stop needs roughly four times as much stopping
distance (for comparable braking force) at twice the speed, not twice as
much.

Doubling an object's speed multiplies its kinetic energy by ==4==, which is why braking distance grows so much faster than speed does. ^card-ci6f

Why is the work-energy theorem often faster to apply than kinematics for finding a final speed, even though both approaches use the same underlying physics? :: Kinematics requires tracking the full time history of the motion — position, velocity and acceleration as functions of t — even when the problem never asks about time. The work-energy theorem skips straight from force to speed by way of energy, so any problem where only an initial and final speed are wanted, and time is irrelevant, avoids solving for a quantity nobody needed in the first place. ^card-q64z

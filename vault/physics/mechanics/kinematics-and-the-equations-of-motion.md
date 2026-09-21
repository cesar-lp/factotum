---
topic: physics
category: physics-mechanics
tags: [kinematics, motion, projectile-motion, vectors]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 2"]
---

# Kinematics and the equations of motion

This is the first note on the shelf, so it sets the vocabulary the rest of
`vault/physics/mechanics/` builds on: position, velocity and acceleration
as a chain of derivatives, and the specific hypothesis under which that
chain collapses into four algebraic equations. `vault/math/calculus/`
already covers what a derivative is — this note only uses that machinery,
it does not re-teach it.

Velocity is the rate of change of position, and acceleration is the rate
of change of velocity:

```
v = dx/dt
a = dv/dt
```

Nothing about that chain requires acceleration to be constant. But the
moment you write down `v = v0 + a*t` or any of its relatives, you have
smuggled in an assumption, and stating it is not optional — it is the
single most common source of error in this topic. Someone plugs a
changing acceleration into a constant-acceleration formula and gets a
confident, wrong number, with no error message to catch it.

> [!card] mcq
> A car's acceleration increases steadily from 0 to 4 m/s^2 over 10
> seconds (it is not constant). What happens if you use `v = v0 + a*t`
> with `a` set to the average acceleration to find the final velocity?
> - [x] It gives the wrong answer — the equation assumes constant acceleration throughout, and no single "effective" value of `a` reproduces the true final velocity from a changing one in general
> - [ ] It gives the exact right answer, since averaging the acceleration always compensates for it changing
> - [ ] The equation still applies unchanged, because `v = v0 + a*t` never assumed anything about acceleration in the first place
> - [ ] It works as long as you also average the initial velocity ^card-5c28

Under that one hypothesis — acceleration constant over the interval — the
four equations relating displacement `x - x0`, initial velocity `v0`,
final velocity `v`, acceleration `a`, and elapsed time `t` are:

```
v  = v0 + a*t                      (omits x - x0)
x - x0 = v0*t + (1/2)*a*t^2        (omits v)
v^2 = v0^2 + 2*a*(x - x0)          (omits t)
x - x0 = (1/2)*(v0 + v)*t          (omits a)
```

> [!card] recall
> Write the four constant-acceleration kinematic equations, and state the
> variable each one omits.
> ---
> v = v0 + a*t (omits x - x0)
> x - x0 = v0*t + (1/2)*a*t^2 (omits v)
> v^2 = v0^2 + 2*a*(x - x0) (omits t)
> x - x0 = (1/2)*(v0 + v)*t (omits a) ^card-nm0b

Each equation is missing exactly one of the five quantities, which is
the practical reason to memorize the layout rather than just one formula:
you pick the equation whose missing variable is the one you were never
given, instead of solving a system.

Why does knowing which variable an equation omits matter for solving a kinematics problem, rather than just picking any of the four and solving algebraically? :: Because the four equations are not independent alternatives to plug numbers into at random — each is missing exactly one of the five quantities (x - x0, v0, v, a, t). If a problem never states or asks for one of those five, the equation that omits it is the one solvable directly from the given data, without first solving for an unneeded intermediate quantity. ^card-vbmv

Position, velocity and acceleration are all vectors, and in more than one
dimension each component evolves independently under its own
acceleration. This is exactly what makes projectile motion tractable:
horizontal velocity stays ==constant== (no horizontal acceleration, ignoring ^card-gsgl
air resistance), while gravity alone governs the vertical component,
at `-9.8 m/s^2`.

What lets you analyze horizontal and vertical motion in a projectile separately, using the same time variable t, instead of solving one coupled two-dimensional problem? :: Acceleration in one perpendicular direction has no effect on velocity or position in the other. Horizontal and vertical motion are governed by independent equations of the same t, which is why a projectile's horizontal velocity component never changes while its vertical component follows ordinary free-fall kinematics. ^card-px7r

Working with signed quantities in one dimension requires a sign
convention: which direction counts as positive for position, velocity,
and acceleration. Nothing forces "up" or "right" to be positive — but
once you pick, every equation in the problem must use that same choice.
An object slowing down while moving in the positive direction has
negative acceleration; an object slowing down while moving in the
negative direction has positive acceleration. The physics doesn't change;
only the bookkeeping does.

> [!card] mcq
> A ball is thrown straight up, and you choose upward as positive. What
> sign is its acceleration while in flight (ignoring air resistance)?
> - [x] Negative throughout the flight — gravity points downward, opposite the chosen positive direction, regardless of whether the ball is rising or falling
> - [ ] Positive while rising, negative while falling
> - [ ] Negative while rising, positive while falling
> - [ ] Zero at the instant it reverses direction, otherwise negative ^card-72lw

Average velocity over an interval is displacement divided by elapsed
time; instantaneous velocity is the derivative of position at one
instant. The two are ==equal== only when acceleration is zero over that ^card-74sz
interval — otherwise the object's speed is changing throughout, so the
average necessarily differs from the value at any single instant.

Why do average velocity and instantaneous velocity coincide for an object moving at constant velocity, but generally differ for one under constant nonzero acceleration? :: With zero acceleration, velocity never changes, so its value at every instant equals the constant value that also equals displacement over time. With nonzero acceleration, velocity is different at every instant during the interval, so the single average value (displacement over elapsed time) cannot equal all of those changing instantaneous values — it can coincide with at most one moment. ^card-hx6g

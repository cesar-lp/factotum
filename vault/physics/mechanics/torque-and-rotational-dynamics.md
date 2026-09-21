---
topic: physics
category: physics-mechanics
tags: [torque, rotational-dynamics, moment-of-inertia, rotational-kinetic-energy]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 10-11"]
---

# Torque and rotational dynamics

Every note so far in this shelf treats bodies as points: `F = m*a`
relates a force to how a point mass accelerates, with no notion of the
body's shape or its size. This note is where shape starts to matter —
rotation depends on *where* a force is applied and *how* an object's
mass is spread out, not just on how much mass or force there is.

**Torque** is the rotational analogue of force — what actually causes
angular acceleration:

```
tau = r x F                    magnitude: |tau| = r*F*sin(theta)   [N*m]
```

where `r` is the vector from the rotation axis to the point where `F` is
applied, and `theta` is the angle between `r` and `F`.

`vault/math/linear-algebra/cross-product-and-oriented-area.md` covers
the cross product itself as a piece of mathematics — orientation,
magnitude as an area, the algebraic properties — and this note only uses
it, so refer there for how `r x F` actually works as an operation.

The `sin(theta)` factor is the whole content of the ==lever arm== idea. ^card-ngs5

Only the component of `F` perpendicular to `r` produces any torque at
all. A force applied exactly along `r` — straight toward or away from
the axis — has `theta = 0` or `180`, so `sin(theta) = 0` and it produces
zero torque no matter how large it is. This is why pushing on a door
right at its hinge, however hard, spins nothing: `r` is nearly zero
there, and even a well-aimed push at that location has essentially no
lever arm to act through.

> [!card] mcq
> You push on a door with the same force magnitude in two ways: (A) at
> the doorknob, perpendicular to the door's face, and (B) at the same
> spot but pushing straight toward the hinge (along the door's plane
> toward the axis). Which produces more torque about the hinge?
> - [x] (A) — the force is perpendicular to r, giving sin(theta) = 1 and the full r*F as torque; (B) is directed along r, giving sin(theta) = 0 and zero torque
> - [ ] (B) — pushing toward the hinge concentrates force closer to the axis
> - [ ] Both produce equal torque, since the force magnitude and application point are the same
> - [ ] Neither produces torque unless the door is already moving ^card-deu3

Why does pushing on a door exactly at the hinge produce no rotation, regardless of how much force is applied? :: Torque's magnitude is r*F*sin(theta); at the hinge, the distance r from the axis to the point of application is essentially zero, so the torque r*F*sin(theta) is zero regardless of F. There is no lever arm for the force to act through. ^card-h36d

Just as `F = m*a` relates force to linear acceleration through mass, torque
relates to angular acceleration through **moment of inertia**, `I`:

```
tau_net = I*alpha
```

`I` is the rotational counterpart of mass — it measures resistance to
*angular* acceleration the way mass measures resistance to linear
acceleration. But `I` has a property mass never has: **it depends on the
axis of rotation**, not only on how much mass the body has. The same
rigid body can have several different values of `I` depending on which
axis it's spinning about, because `I` weights each bit of mass by the
square of its distance from that particular axis:

```
I = sum_i m_i*r_i^2          (discrete masses)
I = int r^2 dm                (continuous body)
```

Mass farther from the axis contributes far more (`r^2`, not `r`), which
is why redistributing the same mass farther out — without adding any of
it — increases `I` even though nothing about "how much stuff" changed.
This axis-dependence, not the formula itself, is the point of the note:
two bodies of identical mass are not interchangeable rotationally unless
their mass is also distributed the same way relative to the same axis.

> [!card] mcq
> A solid disc and a ring have the same mass and the same outer radius.
> Why does the ring have a larger moment of inertia about the central
> axis?
> - [x] All of the ring's mass sits at the maximum radius, while the disc's mass is spread from the center outward — since I weights mass by r^2, concentrating mass farther from the axis increases I even with equal total mass
> - [ ] The ring has more mass than the disc
> - [ ] Moment of inertia only depends on total mass, so they must be equal, and the premise is wrong
> - [ ] The ring rotates faster, which increases its moment of inertia ^card-4dox

Some standard results, worth having as a reference rather than
re-deriving each time:

```
Solid disc/cylinder, central axis:   I = (1/2)*M*R^2
Thin ring/hoop, central axis:        I = M*R^2
Solid sphere, through center:        I = (2/5)*M*R^2
Thin rod, through center, perp.:     I = (1/12)*M*L^2
Thin rod, through one end, perp.:    I = (1/3)*M*L^2
```

Notice the rod's two values differ by a factor of 4 depending only on
where the axis sits — the same body, the same mass, a different `I`
purely from moving the axis to the end.

> [!card] recall
> Explain, from the definition `I = int r^2 dm`, why a thin rod's moment
> of inertia about an axis through one end is larger than about an axis
> through its center — without looking up the standard-forms table.
> ---
> Every mass element's distance to the axis matters through `r^2`.
> Measuring from the center, distances range symmetrically from 0 up to
> `L/2` on both sides. Measuring from one end, every element is farther
> from that axis — distances now range from 0 to the full `L` — so every
> `r^2` term is larger, and the integral comes out bigger (in fact
> `(1/3)*M*L^2` versus `(1/12)*M*L^2`, a factor of 4). ^card-2h0m

Moving the axis away from the centre of mass without changing which axis
*direction* it's parallel to is covered by the **parallel axis theorem**,
which avoids re-integrating from scratch:

```
I = I_cm + M*d^2
```

where `I_cm` is the moment of inertia about a parallel axis through the
centre of mass and `d` is the distance between the two parallel axes.
Applying it to the rod above (`I_cm = (1/12)*M*L^2`, `d = L/2`) reproduces
`(1/12)*M*L^2 + M*(L/2)^2 = (1/3)*M*L^2` exactly, without a second
integration.

State the parallel axis theorem and identify what each symbol requires (in particular, what I_cm must be measured about). :: I = I_cm + M*d^2, where I_cm is the moment of inertia about an axis through the body's center of mass, d is the perpendicular distance from that center-of-mass axis to the new (parallel) axis, and M is the total mass. I_cm specifically must be about the center of mass — the theorem does not let you shift between two arbitrary parallel axes directly; one of them has to be the center-of-mass axis. ^card-f92w

Rotational kinetic energy takes the same form as translational kinetic
energy with `I` in place of `m` and `omega` in place of `v`:

```
KE_rot = (1/2)*I*omega^2
```

The case where a round body rolls along a surface with no skidding is
called ==rolling without slipping==, and it is the case worth having a ^card-llor
name for because its kinetic energy has two independent pieces.

A rolling object has *both* a translational and a
rotational term (`KE = (1/2)*M*v_cm^2 + (1/2)*I_cm*omega^2`), and because
different shapes carry their mass differently, they split their kinetic
energy differently between those two terms even at the same speed. That
is exactly why a hoop and a solid disc of equal mass and radius,
released together at the top of the same ramp, do not reach the bottom
together: the hoop's mass sits entirely at the rim (`I = M*R^2`), so more
of the available gravitational energy has to go into spinning it up
rather than translating it, leaving it slower down the ramp than the
disc.

Why do a hoop and a solid disc of equal mass and radius, released from rest at the top of the same ramp, arrive at the bottom at different times despite losing the same gravitational potential energy? :: Rolling without slipping splits the released energy between translational and rotational kinetic energy. The hoop's larger moment of inertia (I = M*R^2 versus the disc's (1/2)*M*R^2) means a larger share of the available energy must go into spinning it up for a given rolling speed, leaving less for translation — so the hoop reaches a lower v_cm and arrives later than the disc, even though both started with identical energy. ^card-mi0c

---
topic: physics
category: physics-mechanics
tags: [newtons-laws, free-body-diagrams, force, normal-force]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 5-6"]
---

# Newton's laws and free-body diagrams

`kinematics-and-the-equations-of-motion.md` describes how objects move
without asking why. This note is about why: the three laws that connect
motion to force, and the one drawing technique — the free-body diagram —
that turns "why" into a solvable equation for any body, no matter how
tangled the situation looks.

Newton's first law is often taught as a special case of the second (zero
net force implies zero acceleration), but it is doing separate work: it
**defines what an inertial frame is**. A frame in which an object with no
net force on it moves at constant velocity (including staying at rest) is
inertial; in a non-inertial frame — an accelerating car, a rotating
platform — objects appear to accelerate with no real force causing it, and
the first law's own definition tells you that frame doesn't qualify.

Because the first law defines what counts as an inertial frame, a frame
fails the test the moment an object with zero net real force on it still
appears to accelerate. What shows up in that non-inertial frame is a
fictitious force — a lurch with no physical agent behind it, like the
sideways push felt in a braking car, which is really just the car's frame
decelerating while the rider's body tends to keep moving straight.

Why is the first law not just the special case of $F_{net} = ma$ with $F_{net} = 0$? :: Because the second law is only true in an inertial frame, and something has to say which frames those are. The first law does that job: it declares that a frame where a force-free object moves at constant velocity is inertial. Read as a special case of the second law it is redundant, but read as a definition it is what licenses applying the second law at all — in a braking car or on a rotating platform, objects accelerate with no real force acting, and $F_{net} = ma$ simply does not hold there. ^card-5cxd

The second law is $F_{net} = ma$, and the entire law lives in one word:
**net**. $F_{net}$ is the vector sum of every force acting on the body, not
any single force in isolation. Most errors with this law come from
plugging in one applied force and ignoring the others — friction,
gravity, a normal force — that are also present and also contribute to
the sum.

```
Law 1: an object's velocity stays constant unless a net force acts on it
       (this is the definition of an inertial reference frame)
Law 2: F_net = m*a
Law 3: for every force a body A exerts on body B, B exerts a force on A
       that is equal in magnitude and opposite in direction
```

> [!card] mcq
> A box sits on a table under gravity, a normal force, and someone
> pushing sideways with friction resisting the push. To find the box's
> acceleration correctly, $F_{net}$ in $F_{net} = ma$ should be taken as:
> - [x] The vector sum of gravity, the normal force, the push, and friction, all acting on the box
> - [ ] Only the push, since that is the force causing the motion
> - [ ] The push minus friction only, ignoring gravity and the normal force since they are vertical
> - [ ] Whichever single force has the largest magnitude ^card-muhs

The third law pairs a force on one body with a force on a **different**
body — and that phrase is the entire card. An action-reaction pair can
never appear together in a single body's $F_{net}$, because by definition
the two forces act on two different objects. A book resting on a table
feels gravity pulling it down and the table's normal force pushing it
up; those two forces balance for the book, but neither is the other's
reaction-law partner. The book's true third-law partner to gravity is the
book pulling the Earth upward; its partner to the normal force is the
book pushing down on the table.

> [!card] mcq
> A book rests on a table, in equilibrium. Its weight (gravity) and the
> table's normal force on it are equal and opposite. Are these two forces
> a Newton's-third-law action-reaction pair?
> - [x] No — both forces act on the same body (the book); a third-law pair always consists of forces on two different bodies
> - [ ] Yes — they're equal in magnitude and opposite in direction, which is exactly what a third-law pair requires
> - [ ] Yes, but only because the book is in equilibrium
> - [ ] No, because gravity and normal force are different types of force, and third-law pairs must be the same type ^card-lg3m

The free-body diagram is the method that makes the second law usable on a
messy problem: isolate one body, draw only the forces acting *on* that
body (never forces it exerts on something else, and never a third-law
partner that acts on a different object), choose a set of axes, and
resolve each force into components along them before summing.

> [!card] recall
> State the four steps of drawing a free-body diagram for a single body,
> and explain why restricting the diagram to forces acting on only that
> one body is what makes the technique work on complicated systems.
> ---
> 1. Isolate one body. 2. Draw only the external forces acting on that
> body (never forces it exerts elsewhere, never a reaction-pair force
> acting on a different object). 3. Choose axes. 4. Resolve each force
> into components along those axes and sum them.
> Restricting the diagram to one body's own forces turns a system of
> interacting objects into a single vector equation, F_net = m*a, for
> that body alone — the interactions with other bodies are already
> captured as individual forces in the diagram, so nothing about the
> rest of the system needs to be tracked simultaneously. ^card-p4c7

Mass and weight are not the same quantity, and conflating them is a unit
error as much as a conceptual one. Mass, in $\mathrm{kg}$, is an intrinsic
property — how much matter, and how much inertia. Weight, in $\mathrm{N}$, is the
gravitational force on that mass, $W = mg$, and it changes with location
(smaller on the Moon) while mass does not.

An object's weight in newtons on Earth is $mg$ with $g = 9.8 \text{ m/s}^2$. What happens to its weight, and what happens to its mass, if the same object is moved to the Moon (g ≈ 1.6 m/s^2)? :: Its weight decreases, since W = m*g and g is smaller — the object weighs roughly a sixth as much. Its mass is unchanged, because mass is an intrinsic property of the object (its amount of matter and its inertia), not a force, and does not depend on the local gravitational field. ^card-elq9

Normal force is a **constraint response**, not a fixed value — it is
whatever magnitude keeps a surface from letting a body pass through it,
which means it is not always equal to $mg$. An elevator makes this
concrete: standing on a scale in an elevator accelerating upward at $a$,
the normal force (what the scale reads) is $N = m(g + a)$, larger than
your weight; accelerating downward, $N = m(g - a)$, smaller than your
weight; in free fall, $N = 0$.

Why is it wrong to assume the normal force on a person standing in an accelerating elevator always equals m*g? :: Because normal force is not a fundamental force with a fixed formula — it is whatever value the surface must supply to prevent penetration, determined by applying F_net = m*a to the person. When the elevator accelerates, the net force on the person is nonzero, so the normal force must differ from m*g by exactly m*a to produce that acceleration; N = m*g only holds in the special case of zero vertical acceleration. ^card-iz8i

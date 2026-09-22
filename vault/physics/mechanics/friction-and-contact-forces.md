---
topic: physics
category: physics-mechanics
tags: [friction, static-friction, kinetic-friction, tension, inclined-plane]
citations: ["Halliday, Resnick & Walker, Fundamentals of Physics 10e, Ch. 6"]
---

# Friction and contact forces

`newtons-laws-and-free-body-diagrams.md` treats normal force as a
constraint response, whatever value a surface needs to supply. Friction
is the companion force along the surface, and it is where the most
common formula error in introductory mechanics lives: writing
$f_s = \mu_s N$ as if it always holds, when it doesn't.

Static friction is not a fixed value — it is a **range**. It supplies
whatever magnitude, from zero up to a maximum, is needed to keep two
surfaces from sliding relative to each other. $f_s = \mu_s N$ is not that
force in general; it is only the force at the exact threshold of
slipping, the largest value static friction can supply before the
surfaces give way.

$$
\begin{aligned}
0 &\le f_s \le \mu_s N \quad \text{(static, not yet slipping)} \\
f_k &\approx \mu_k N \quad \text{(kinetic, once sliding)}
\end{aligned}
$$

> [!card] mcq
> A 10 kg crate sits at rest on a floor with mu_s = 0.5. A person pushes
> horizontally with 20 N and the crate does not move. What is the
> magnitude of the static friction force on the crate?
> - [x] 20 N — static friction matches the applied force exactly, up to its maximum, so with the crate not accelerating it must equal the push
> - [ ] mu_s*N = 0.5 * (10*9.8) ≈ 49 N, since static friction is always at its maximum value
> - [ ] 0 N, since the crate isn't moving so no friction acts
> - [ ] It cannot be determined without knowing the crate's speed ^card-bbns

Why is $f_s = \mu_s N$ the wrong general formula for static friction, even though it correctly gives the maximum static friction available? :: Because static friction is a self-adjusting response that takes on whatever value, between zero and mu_s*N, is needed to prevent relative sliding — mu_s*N is only reached at the threshold of slipping. Below that threshold, the actual static friction equals whatever other force it must balance, which can be any value up to that maximum, not the maximum itself. ^card-bpxx

Once sliding starts, kinetic friction is treated as approximately
constant at $\mu_k N$, independent of the object's speed. Experimentally,
$\mu_k$ is typically less than $\mu_s$ for the same pair of surfaces, which
has an everyday consequence worth stating as its own fact: it takes more
force to get something moving than it does to keep it sliding once it's
already in motion.

Given that mu_k is typically less than mu_s for a given pair of surfaces, what does that predict about the force needed to start a stationary object sliding versus the force needed to keep it sliding at constant velocity once moving? :: More force is needed to start the object moving (overcoming the higher maximum static friction, mu_s*N) than to keep it sliding at constant velocity afterward (overcoming the smaller kinetic friction, mu_k*N). Once past the initial threshold, the required force drops. ^card-fk2p

The friction model's most surprising empirical content is what it does
**not** depend on: the coefficients $\mu_s$ and $\mu_k$ are (to good
approximation) independent of the contact area between the surfaces, and
$\mu_k$ is independent of the sliding speed. Neither is a law of nature in
the way $F_{net} = ma$ is — both are empirical approximations that break
down at extremes: very high pressures, very high speeds, or surfaces
that deform or heat significantly under sliding.

> [!card] recall
> Explain what makes the friction model's independence from contact area
> surprising, and state one condition under which the model is known to
> break down.
> ---
> It's surprising because a naive expectation is that more contact area
> means more friction (more surface "gripping"), the way it would for an
> adhesive. Instead, over a wide range of ordinary conditions, doubling
> the contact area while keeping normal force fixed leaves friction
> essentially unchanged — a smaller area presses harder per unit area,
> compensating. The model breaks down at extremes: very high contact
> pressure, very high sliding speed, or surfaces that deform or heat
> significantly under sliding. ^card-4vcq

On an incline at angle $\theta$, gravity resolves into a component along
the surface and a component into the surface:

$$
\begin{aligned}
\text{along the incline (down-slope):} &\quad mg\sin(\theta) \\
\text{into the incline:} &\quad mg\cos(\theta) \\
\text{normal force:} &\quad N = mg\cos(\theta)
\end{aligned}
$$

A block on the incline is on the verge of slipping exactly when the
down-slope component of gravity equals the maximum static friction
available, which gives the tipping-point angle independent of mass:

$$
\begin{aligned}
mg\sin(\theta) &= \mu_s N = \mu_s mg\cos(\theta) \\
\tan(\theta) &= \mu_s
\end{aligned}
$$

> [!card] recall
> Derive the condition for the angle at which a block on an incline is
> on the verge of sliding, starting from the down-slope and
> perpendicular components of gravity.
> ---
> Gravity resolves into m*g*sin(theta) along the incline and
> m*g*cos(theta) into the incline, so N = m*g*cos(theta). The block is on
> the verge of slipping when the down-slope component equals the maximum
> static friction: m*g*sin(theta) = mu_s*N = mu_s*m*g*cos(theta). Mass
> cancels, leaving tan(theta) = mu_s — the tipping angle depends only on
> the coefficient of static friction, not on the block's mass. ^card-zwny

Tension is the pulling force a stretched string, rope, or cable exerts
along its length. The standard simplifying idealization is a **massless**
string: since $F_{net} = ma$ with $m = 0$ forces the net force on any
segment of the string to be zero, tension must be the ==same== throughout ^card-angb
its length (through an ideal, frictionless pulley too), which is what
lets you treat the string as a single connector transmitting one force
rather than solving for its internal distribution.

What physical assumption makes tension uniform throughout a massless, frictionless string or rope? :: With zero mass, F_net = m*a forces the net force on every segment of the string to be exactly zero, since any nonzero net force on a massless segment would produce infinite acceleration. That requires the tension pulling on each end of every segment to be equal in magnitude, which propagates the same tension value along the whole string. ^card-u9n1

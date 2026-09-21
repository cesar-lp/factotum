---
topic: aws
category: aws-edge
tags: [shield, ddos, availability, cost-protection]
citations: ["AWS Shield Advanced Developer Guide — 'How AWS Shield works'"]
---

# Shield and DDoS Protection

`waf-rules-and-rate-limiting.md` covers filtering individual requests by
pattern; this note covers the layer below that — absorbing sheer volume
before it ever reaches something that has to evaluate a rule at all. The
distinction this note exists to teach is between the two tiers of AWS
Shield, and why the subscription matters far less than the architecture
it sits behind.

**Shield Standard** is on by default for every AWS customer, at no
additional cost, and defends against the most common network- and
transport-layer floods — SYN floods, UDP reflection, and similar
volumetric attacks — by absorbing them at the AWS edge before they
reach your resources. **Shield Advanced** is a paid subscription layered
on top, adding application-layer (L7) attack detection, cost protection
against the scaling charges an attack itself can trigger, and access to
the AWS DDoS Response Team.

> [!card] mcq
> Which statement correctly distinguishes Shield Standard from Shield
> Advanced?
> - [x] Standard is free and automatic, covering common L3/L4 floods; Advanced is a paid subscription adding L7 detection, cost protection, and response-team access
> - [ ] Standard only covers EC2; Advanced is required for any other AWS service
> - [ ] Both provide identical protection; Advanced only adds a support contract
> - [ ] Standard must be manually enabled per resource, while Advanced is automatic ^card-ziw9

Why is it inaccurate to describe Shield Advanced as "turning on DDoS protection" that was previously absent? :: Shield Standard already runs automatically for every customer at no cost, absorbing common network- and transport-layer floods at the AWS edge. Shield Advanced doesn't switch on protection from nothing — it adds capabilities Standard lacks: detecting attacks at the application layer, protecting against the cost of scaling triggered by an attack, and giving you the DDoS Response Team, all layered on top of protection that was already running. ^card-o7ye

Architecture matters more than the subscription tier, because of where
absorption actually happens: an attack against a resource fronted by
CloudFront and Route 53 is diluted across AWS's ==global== edge network ^card-zpso
before it ever reaches your origin, while a resource with a public
address reachable directly takes the full force of the attack itself,
regardless of which Shield tier is subscribed. This is the same lesson
origin access control teaches from a different angle — an origin with no
direct path in isn't just safer against ordinary traffic, it's safer
against volumetric attacks too, because there's nothing to hit directly.

What single design choice matters more for surviving a large-scale DDoS attack than whether Shield Advanced is subscribed? :: Whether the protected resource has any direct, publicly reachable path at all. Traffic aimed at a CloudFront distribution and Route 53 records gets absorbed and diluted across AWS's global edge before it reaches the origin; traffic aimed at an origin with its own public address hits that origin directly, and no Shield subscription changes that geometry. ^card-ejwn

Different attack layers need different defenses, which is why Shield
and WAF are complementary rather than competing tools. Volumetric floods
and protocol-level attacks (L3/L4) are absorbed by raw edge capacity —
Shield's territory. Application-layer floods — a wave of individually
valid-looking HTTP requests meant to exhaust compute rather than
bandwidth — pass straight through L3/L4 defenses because nothing about
them looks abnormal at that level, and it takes a rate-based WAF rule
(`waf-rules-and-rate-limiting.md`) to catch that pattern instead.

> [!card] recall
> A service is protected by Shield Standard alone and suffers an
> application-layer flood: a large number of individually valid HTTPS
> requests aimed at an expensive endpoint. Explain why Shield Standard's
> volumetric defenses don't stop this, and what tool actually would.
> ---
> Shield Standard's defenses work by absorbing raw volume at the network
> and transport layers — they look for patterns like SYN floods or
> reflection attacks, not at whether an individually well-formed HTTPS
> request is part of a coordinated flood. Each request in an
> application-layer flood is syntactically legitimate, so it sails
> through L3/L4 defenses untouched. A rate-based WAF rule, which counts
> requests per aggregation key and blocks or challenges whoever exceeds
> it, is the tool built for that layer instead. ^card-yggg

Cost is itself an attack surface, separate from availability. A target
that autoscales under load will scale in response to attack traffic just
as it would to legitimate traffic — and once it does, the bill for that
extra capacity is real damage even if every request was successfully
served and nothing ever went down. Shield Advanced's ==cost protection== ^card-9kci
exists specifically to address this: it can credit back the scaling
charges incurred by resources responding to a detected DDoS event, which
plain volumetric defense at the edge does nothing about.

Why can a service survive a DDoS attack without any downtime and still come out of it having suffered real damage? :: An autoscaling resource under attack scales to keep serving requests, exactly as designed — availability holds. But every unit of that extra capacity costs money, and an attack large enough to trigger significant autoscaling can produce a bill far beyond normal traffic, even though nothing was ever unavailable. That inflated bill is the damage, and it's the specific harm Shield Advanced's cost protection is built to reimburse. ^card-tv89

No subscription tier removes the underlying requirement: a design with
no direct network path to the origin is what actually limits what an
attacker can reach, and Shield (at either tier) plus WAF only work as
well as that architecture lets them.

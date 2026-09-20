---
topic: identity
category: identity-oauth
tags: [oauth, front-channel, back-channel, browser, exposure]
citations: ["RFC 6749 (OAuth 2.0 Authorization Framework)", "OAuth 2.1 (draft)"]
---

# Front channel versus back channel

`the-authorization-code-flow.md` moves data over two different paths
without naming them. This note names them, because almost every design
decision in OAuth's flows — what a value is allowed to be, how long it
can live, what has to verify it — traces back to which of these two
channels that value travels over.

The ==front channel== is the user's browser. Parameters sent this way ^card-1fkb
ride along in URLs, as query strings on a redirect, which means they
end up in the browser's address bar, in its local history, in the
access logs of every server the browser talks to along the way, and
potentially in a `Referer` header handed to the next site the browser
visits afterward. Anything sent this way can be read, or even altered
before it arrives, by whoever controls that browser or sits on the
network path in between.

The ==back channel== is a different path: a direct call from the ^card-4k8u
client's own server straight to the authorization server, with no
browser in the middle at all. It is confidential, since no intermediate
party reads the payload; mutually identified, since each side
authenticates the other rather than trusting an anonymous caller; and
invisible to the user agent, which never sees the call happen.

What three properties does the back channel have that the front channel lacks, and what single change accounts for all three at once? :: Confidentiality (no intermediate party reads the payload), mutual identification (each side authenticates the other), and invisibility to the user agent. All three trace back to one change: removing the browser from the path removes the one participant in the exchange that has no obligation to keep anything private or to verify who it's actually talking to. ^card-5bvc

That difference has a direct consequence for what kind of value each
channel can carry safely.

Why can a value whose entire safety depends on staying confidential never be sent over the front channel, no matter how briefly it's exposed there? :: Because the front channel writes it into places that can't be un-exposed afterward — browser history, intermediate access logs, a Referer header on the next site visited. Once it lands in any of those, it is permanently out of the client's control, so a confidentiality requirement is violated the instant the value is used there, regardless of how short the exposure felt at the time. ^card-v9og

A value that does have to cross the front channel — because the whole
point of a redirect-based flow is to get something back through the
user's browser — can't lean on the front channel's privacy, since it
has none. The mitigation is to make sure the value itself doesn't need
that privacy: keep it single-use, so a copy read out of a history entry
or a log after the real exchange has no remaining use, and have the
receiving party independently verify it over the back channel rather
than trusting it just because it arrived at the right endpoint.

Why must a value that is forced onto the front channel be both single-use and independently re-verified by the receiving party, rather than trusted at face value on arrival? :: Because the front channel offers no confidentiality guarantee, so the value has to survive being read by someone other than the intended recipient. Making it single-use means a leaked copy has nothing left to redeem once the legitimate exchange has happened, and independent verification over the back channel means the receiving party never grants anything on the strength of the front-channel value alone — it has to be confirmed through a channel that actually offers confidentiality and mutual identification. ^card-4i84

> [!card] mcq
> A value must travel through the user's browser as part of a redirect,
> where browser history, intermediate logs, and Referer headers could
> all later expose a copy of it. Which property, on its own, most
> reduces the damage from that exposure even though the exposure itself
> still happens?
> - [x] The value can only ever be redeemed once, so a copy read out of history or logs later has no remaining use
> - [ ] The value is sent over HTTPS, so no third party can see what it was
> - [ ] The value is short enough that most log lines truncate it
> - [ ] The value looks identical to a random session identifier ^card-otpm

> [!card] recall
> Explain why the same kind of information can be handled completely
> differently — safe in one case, dangerous in the other — purely
> depending on which of the two channels carries it. State the general
> rule for deciding which channel a given value belongs on.
> ---
> Exposure risk isn't a fixed property of a value; it's a property of
> the channel that carries it. A single-use value that still requires
> independent verification at the far end is tolerable on the front
> channel, because a copy observed after the fact accomplishes nothing
> — redeeming it was already a one-time event tied to a further,
> separately verified step. A value whose safety depends purely on
> staying confidential cannot tolerate that same exposure, because the
> front channel turns confidentiality into a fiction the moment the
> value appears in a URL. The general rule: a value belongs on the back
> channel if exposure alone would be enough to compromise the flow, and
> can tolerate the front channel only if exposure alone accomplishes
> nothing without a further, independently verified step. ^card-7jvf

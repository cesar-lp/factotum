---
topic: identity
category: identity-saml
tags: [saml, xml-signature, canonicalization, wrapping-attack, signing]
citations: ["W3C XML Signature Syntax and Processing", "OASIS SAML 2.0 Core"]
---

# XML Signatures in SAML

Take a signature over some data as a settled primitive: it proves a
private key produced a tag over a specific set of bytes, and anyone
holding the matching public key can check that. Signing an XML
document is harder than signing bytes, and SAML's failure modes come
from exactly that gap.

The first source of trouble is that a SAML message doesn't have one
fixed place a signature must live. Either the Response, the Assertion
it wraps, or both can carry a signature, and nothing about the wire
format forces one particular arrangement.

> [!card] mcq
> A SAML implementation receives a Response whose Assertion is signed
> but whose outer Response element carries no signature at all. What
> should the implementation do?
> - [x] Know in advance which element it requires signed, and reject the message if that specific element isn't the one carrying a valid signature
> - [ ] Accept it, since some element in the message is signed
> - [ ] Reject it automatically, since the outer Response is always the element that must be signed
> - [ ] Accept it only if the Assertion's signature also happens to cover the Response ^card-s0rx

Whatever is signed can't be hashed as it sits on the wire, either.
The same logical XML content can be serialized in more than one way —
attributes in a different order, different whitespace, different
namespace prefixes — and all of those byte-for-byte-different
serializations represent the identical document.

Before anything is hashed, both sides have to reduce the document to
one agreed normal form; that reduction step is ==canonicalization==. ^card-2pb3

Skipping or mismatching that step isn't a formatting nitpick — a
signature computed over one serialization won't verify against a
different, equally valid serialization of the exact same content, so
canonicalization has to be a fixed, shared algorithm rather than
something each implementation picks for itself.

What problem does canonicalization solve for an XML signature, and why can't it be skipped? :: The same XML content can be serialized many different ways — attribute order, whitespace, namespace prefixes can all differ while representing identical data. A signature is computed over one specific byte sequence, so before hashing, both the signer and the verifier have to reduce the document to one agreed normal form. Skipping that step means a signature made over one valid serialization simply won't verify against another equally valid serialization of the same content. ^card-oytq

The sharpest hazard, though, isn't about serialization at all — it's
about which element the application ends up reading.

An XML signature doesn't sign "the document"; it signs one specific
element, identified by a ==reference== inside the signature itself. ^card-3343
Nothing stops a document from containing an element that carries a
perfectly valid signature alongside a second, different element that
the signature says nothing about.

That gap is exactly what a signature wrapping attack exploits: an
attacker takes a legitimately signed Assertion, moves it elsewhere in
the document — say, into a comment or an unused branch — and inserts a
new, unsigned Assertion with attacker-chosen content in the position
the application actually reads from. The signature over the original,
now-relocated element still checks out perfectly; the application
never looks at that element, only at the one sitting where it expects
one to be.

> [!card] recall
> Explain how a signature wrapping attack can leave an XML signature
> check reporting success while the application still consumes
> attacker-controlled data.
> ---
> The signature in the document is mathematically valid — it does
> cover some element, and verifying it against that element succeeds.
> The attack works by making sure the element the application actually
> reads is a different one than the element the signature's reference
> points to: the attacker relocates the originally signed element
> somewhere the application won't look, and plants a new, unsigned
> element with their own content in the position the application reads
> by structure or position instead of by reference. Signature
> verification passes because it never claimed to say anything about
> that second element. ^card-f6vg

The rule that follows from this is the one worth carrying forward:
confirming a document contains a valid signature is not the same
claim as confirming the data an application consumed was the data
that signature covered.

Why is "the document contains a valid signature" not sufficient grounds for an application to trust the data it read from that document? :: A signature only vouches for whichever element its reference names — verifying it just confirms that element wasn't tampered with. If the application reads a different element than the one named in the reference, that data was never covered by the signature at all, no matter how solidly the signature itself checks out elsewhere in the document. ^card-uap6

> [!card] mcq
> What must a safe implementation check to close the signature
> wrapping gap, beyond confirming the signature's mathematics are
> valid?
> - [x] That the reference inside the signature points to the exact element the application is about to consume
> - [ ] That the document contains at least one valid signature somewhere
> - [ ] That the signing certificate has not expired
> - [ ] That the message was delivered over a channel using transport encryption ^card-7o60

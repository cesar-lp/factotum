---
topic: security
category: security-crypto
tags: [security-goals, threat-models, kerckhoffs, cryptanalysis]
citations: ["Aumasson, Serious Cryptography, Ch. 1"]
---

# Security Goals and Threat Models

Cryptography gets sold as one thing — "encrypt it and it's secure" — but
it actually promises several unrelated properties, and a primitive that
gives you one gives you none of the others for free. That gap is the
thread running through this whole category: whenever a later note says
a cipher, hash, or MAC "does not give you" some property, this is the
list it's being measured against.

**Confidentiality** means an attacker who intercepts the data learns
nothing about its content. **Integrity** means any modification to the
data in transit or storage is detectable. **Authenticity** means the
receiver can verify who produced the data. **Non-repudiation** means
the producer cannot later deny having produced it. These four sound
like a package deal, but they are ==four separate properties==, and a ^card-1u51
primitive built for one routinely fails at the others.

Why is it wrong to say "the data is encrypted, so it's secure"? :: Encryption alone gives confidentiality — an eavesdropper can't read the data. It gives no guarantee that the data wasn't tampered with (integrity) or that it really came from the claimed sender (authenticity). An attacker can flip bits in a ciphertext, or replace it with a different valid-looking ciphertext, without the decrypting party ever knowing, unless a separate mechanism checks integrity and authenticity. ^card-ezqo

Non-repudiation is easy to confuse with authenticity, but they answer
different questions to different audiences. Authenticity convinces the
*receiver*, right now, that a message came from a specific sender — a
shared-secret MAC does this fine, since only the two parties holding
the secret could have produced a valid tag. Non-repudiation convinces a
*third party*, later, that the sender specifically produced it — which
a shared secret can never do, because either party could have forged
the tag, so neither can prove the other one sent it.

> [!card] mcq
> A message is protected with a MAC built from a secret key shared by
> Alice and Bob. Bob receives the message and verifies the MAC. What
> can Bob conclude, and what can he NOT prove to a judge later?
> - [x] He can conclude the message came from someone holding the shared key (Alice, most likely); he cannot prove to a judge it was Alice specifically, since he could have forged it himself
> - [ ] He can prove to a judge that Alice sent it, since only she has the key
> - [ ] He can conclude nothing at all about the message's origin
> - [ ] The MAC proves both authenticity and non-repudiation equally ^card-hwr8

**Kerckhoffs's principle** says a cryptosystem's security must not
depend on keeping the *algorithm* secret — only the key. Assume the
attacker has your full source code, your protocol spec, and everything
except the key itself, and design so that this attacker still learns
nothing. A scheme that only works because the attacker doesn't know how
it's built is called ==security through obscurity==, and it collapses ^card-cnn0
the moment the design leaks — which, for any widely deployed system,
is a matter of when, not if.

Why does treating the algorithm as public actually make a cryptosystem stronger in practice, rather than weaker? :: A published algorithm gets scrutinized by the entire cryptographic community, so weaknesses tend to surface before deployment rather than after. A secret algorithm gets reviewed by nobody but its designer, so its flaws are discovered by attackers first, and once it inevitably leaks — through reverse engineering, an insider, or a leaked spec — there is no fallback, since the design was the only thing standing between the attacker and the data. ^card-t5mk

Beyond what a scheme protects, cryptanalysis also classifies *how much
access* an attacker is assumed to have, from weakest to strongest. In a
==known-plaintext== attack, the attacker has some plaintext-ciphertext ^card-p3lx
pairs produced under the target key but cannot choose them. In a
chosen-plaintext attack (CPA), the attacker can submit arbitrary
plaintexts and observe their ciphertexts. In a chosen-ciphertext attack
(CCA), the attacker can additionally submit arbitrary ciphertexts and
observe their decryptions.

A scheme's designers state which attack model it's built to resist, and
that claim is not interchangeable with a different model: security
against known-plaintext attacks says nothing about chosen-ciphertext
attacks, since the attacker there gets a strictly more powerful oracle.

> [!card] mcq
> Ranking known-plaintext (KPA), chosen-plaintext (CPA), and
> chosen-ciphertext (CCA) attacks by how much power they hand the
> attacker, which ordering is correct from weakest to strongest?
> - [x] KPA < CPA < CCA
> - [ ] CPA < KPA < CCA
> - [ ] CCA < CPA < KPA
> - [ ] All three grant the attacker equivalent power, differing only in setup ^card-wytz

What capability distinguishes a chosen-ciphertext attacker from a chosen-plaintext attacker? :: A chosen-plaintext attacker can only submit plaintexts and see the resulting ciphertexts. A chosen-ciphertext attacker can additionally submit arbitrary ciphertexts of their own choosing and observe what they decrypt to — an oracle a real system can accidentally provide via error messages or padding behavior, which is exactly what padding-oracle attacks exploit. ^card-dals

Finally, "secure" is not an absolute claim of impossibility — it's an
operational one about cost. A scheme is considered secure when the best
known attack costs more, in time or resources, than the value of what
it protects (and ideally, more than is physically feasible at all —
more operations than there are atoms in the observable universe, say).
Security is therefore always relative to a threat model and a resource
budget, not a proof that breaking the scheme is impossible in principle.

Why do cryptographers speak of a cipher as "128-bit secure" rather than simply "unbreakable"? :: Because almost no cryptographic security is an absolute, information-theoretic guarantee — it's a claim that the best known attack requires on the order of 2^128 operations, which is computationally infeasible with current and foreseeable technology. That claim can change: a new cryptanalytic technique can lower the attack cost without the key length changing at all, which is exactly how algorithms once considered secure (like MD5 or single DES) stopped being so. ^card-2skt

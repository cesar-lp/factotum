---
topic: algorithms
category: algo-sorting
tags: [sorting, stability, in-place, hybrid-algorithms]
citations: ["Cormen et al., Introduction to Algorithms 4e, Ch. 6-8"]
---

# Choosing a Sort in Practice

This category has covered heapsort, quicksort, counting sort, radix
sort, and bucket sort as if each stands alone; this note pulls them into
one comparison, since the question a working engineer actually asks is
not "what is its bound" but "which one do I reach for."

The first fork is ==comparison versus non-comparison==: heapsort and ^card-h62j
quicksort work on any totally ordered type using only a `<=` operator and
are bound by Omega(n lg n) (see this category's lower-bound note);
counting sort, radix sort, and bucket sort need structured keys — a
bounded integer range, digits, or a known distribution — but can reach
linear time in exchange.

What single property must the elements have for a comparison sort to work as a general-purpose sort on arbitrary data, independent of any assumption about key structure or distribution? :: A total order — a working `<=` or three-way comparison — on the elements; this is exactly what makes comparison sorts like heapsort and quicksort universally applicable, at the cost of the Omega(n lg n) lower bound that comes with relying only on comparisons. ^card-54da

Stability — preserving equal keys' relative order — splits the category
along different lines than the comparison/non-comparison one. Counting
sort and (LSD) radix sort are stable by construction, as this category's
counting-sort note details; heapsort and Lomuto quicksort are ==not ^card-uunf
stable==, since both rely on swaps that can reorder equal keys.

> [!card] mcq
> Which pairing of algorithm and stability is correct?
> - [x] Counting sort is stable; heapsort is not
> - [ ] Heapsort is stable; counting sort is not
> - [ ] Both heapsort and counting sort are stable
> - [ ] Neither heapsort nor counting sort is stable ^card-qsuh

In-place-ness is a third, separate axis. Heapsort and (in-place) Lomuto
quicksort need only O(1) or O(lg n) auxiliary space; counting sort and
radix sort need Theta(n + k) extra space for their count arrays and
output buffers, trading memory for their linear-time guarantee.

Why can quicksort in practice often outperform heapsort despite both being O(n lg n)-class algorithms (quicksort's average case), even though heapsort has the better worst-case guarantee? :: Quicksort's partitioning touches memory in mostly sequential, cache-friendly scans and its inner loop is simpler, while heapsort's array-as-tree access pattern jumps between indices that are far apart, causing more cache misses per comparison — so quicksort's practical constant factor is usually smaller despite its Theta(n^2) worst case (mitigated by randomization, per this category's randomized-quicksort note). ^card-2t9d

This is why production sort routines are almost never a single textbook
algorithm. Introsort (used in many C++ standard library
implementations) runs quicksort but switches to heapsort if the
recursion depth grows suspiciously large, capping the worst case at
O(n lg n) while keeping quicksort's typical speed. Timsort (Python,
Java's `Arrays.sort` for objects) is a stable merge-based hybrid that
detects and exploits already-sorted runs in real-world data.

> [!card] recall
> Explain why a hybrid like introsort needs *both* a fast average-case
> algorithm and a worst-case-safe fallback, rather than just always
> using the worst-case-safe one — what does the fallback cost when it is
> never triggered, and what does skipping it cost when it is needed? ^card-j0wo

The non-comparison sorts in this category are not just theoretical
curiosities: radix sort is the standard choice for fixed-width integer
or string keys (this category's radix note), and counting sort underpins
it as the stable per-digit subroutine. The practical rule of thumb is:
use a comparison-sort hybrid by default, and reach for a non-comparison
sort only when the key structure this category's counting-sort,
radix-sort, and order-statistics notes describe is actually known and
exploitable.

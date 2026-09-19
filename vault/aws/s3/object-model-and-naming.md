---
topic: aws
category: aws-s3
tags: [object-storage, key-naming, partitioning, listing]
citations: ["AWS Developer Guide — Amazon S3, 'Organizing objects using prefixes'"]
---

# Object Model and Naming

S3 stores objects, not files on a filesystem. An object is a blob of data
plus metadata, addressed within a bucket by a key. The console's "folder"
view is a convenience layered on top of something much simpler underneath,
and that simplicity has real consequences for how you list and scale
access to your data.

A bucket has no directory tree: every object is identified by a single
==key== string, and the apparent folder hierarchy is just that string ^card-m1ac
containing `/` characters by convention.

Why can't you rename an S3 "folder" the way you rename a filesystem directory? :: There is no directory object to rename — a "folder" is just the set of keys that happen to share a leading substring, so renaming it means copying every object under that substring to a new key and deleting the originals, an operation proportional to the number of objects rather than a single metadata update. ^card-r85r

Listing operations reconstruct the illusion of folders by combining a key
==prefix== with a delimiter (usually `/`): the API groups keys sharing ^card-av05
that leading substring into a single listing entry, which is what the
console renders as a folder.

Because there is no separate directory index, listing objects means the
API walks the bucket's keys in ==lexicographic order== and returns those ^card-sxu7
matching the query, rather than looking up a pre-built directory entry.

> [!card] mcq
> Why did giving many objects a shared, sequentially increasing leading
> substring (such as a timestamp) historically risk poor request
> performance at high request rates?
> - [x] Because keys are range-partitioned internally, objects whose keys sort near each other tend to land in the same internal partition, concentrating request load rather than spreading it across the keyspace
> - [ ] Because S3 rejects keys that share a leading substring
> - [ ] Because shared substrings are converted to folders and folders have a size limit
> - [ ] Because internal ordering only applies to keys shorter than 32 characters ^card-nprx

This is the same hot-partition mechanism covered in
`vault/data-systems/partitioning.md` for key-range partitioning: a
contiguous range of keys assigned to one partition turns a skewed access
pattern into a skewed load pattern, whether the system is S3's internal
key ranges or an explicitly range-partitioned database.

What technique spreads request load across a flat keyspace when write or read patterns would otherwise concentrate on a narrow, sort-adjacent range of keys? :: Introducing variation early in the key, such as a hash or reversed/randomized leading substring, so that logically related objects no longer sort next to each other and land across different internal partitions instead of one. ^card-apsd

> [!card] recall
> Explain why S3's "flat keyspace with naming conventions" is a genuine
> design tradeoff rather than just a missing feature: what does the flat
> model make easier, and what does it make harder, compared to a real
> hierarchical filesystem? ^card-z29y

The flat model makes it trivial to have effectively unlimited "folders"
and to reorganize views of the same data with nothing more than a naming
convention, since a leading substring is not a real ==container== that ^card-g4b2
needs to be created before objects can use it.

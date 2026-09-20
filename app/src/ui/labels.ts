/**
 * Turns a raw vault category slug (free-form YAML frontmatter, always
 * lower-kebab today) into a short label for the review chip and the topics
 * list.
 *
 * Categories are grouped under a topic, and many repeat the topic as a
 * prefix purely for sorting/namespacing in the vault source
 * ("algo-graphs" under "algorithms", "aws-s3" under "aws",
 * "os-virtualization" under "operating-systems"). Under a shelf already
 * labelled with the topic, that prefix is pure redundancy, so we strip it
 * when we can tell it is genuinely topic-derived, and leave the category
 * alone otherwise.
 *
 * A prefix counts as topic-derived when it is either:
 *   - a literal truncation of the topic string, e.g. "algo" of
 *     "algorithms", "aws" of "aws" itself; or
 *   - the initialism of the topic's dash-separated words, e.g. "os" for
 *     "operating-systems".
 *
 * This is deliberately narrow. It is keyed off of the specific topic a
 * category was given, not a global lookup table, so a slug that merely
 * *looks* like it belongs to a different topic is not touched:
 * "os-concurrency" lives under the "concurrency" topic in the real vault,
 * and "os" is neither a truncation nor the initialism of "concurrency", so
 * it survives as "os concurrency" rather than being mangled into
 * "concurrency" (its own topic) or misread as an "operating-systems" slug.
 *
 * We never strip a category down to nothing: a category identical to its
 * topic ("networking" under "networking", "data-systems" under
 * "data-systems") is returned whole, and a category with no dash to split
 * on (a bare "amp", or "algo" on its own) is left as-is even if it happens
 * to be a prefix of the topic.
 *
 * Humanizing just swaps dashes for spaces. We keep the result lowercase
 * rather than title-casing it: the source slugs are already lowercase,
 * chips are quiet/tag-like UI, and title-casing would force an opinion on
 * acronyms ("S3", "IAM", "RDS" vs "Api Gateway") that a pure, lookup-free
 * function has no reliable way to get right.
 */
export function categoryLabel(category: string, topic?: string): string {
  if (!category) return '';

  const trimmedTopic = topic ? topic.trim() : '';
  if (!trimmedTopic || category === trimmedTopic) {
    return humanize(category);
  }

  const dashIndex = category.indexOf('-');
  if (dashIndex <= 0) {
    // No prefix to strip: either there's no dash at all, or the category
    // starts with one. Either way there is nothing safe to remove.
    return humanize(category);
  }

  const prefix = category.slice(0, dashIndex);
  const remainder = category.slice(dashIndex + 1);
  if (!remainder) {
    return humanize(category);
  }

  if (isTopicDerivedPrefix(prefix, trimmedTopic)) {
    return humanize(remainder);
  }

  return humanize(category);
}

function isTopicDerivedPrefix(prefix: string, topic: string): boolean {
  // Guard against trivial one-letter "matches" that are really just
  // coincidence.
  if (prefix.length < 2) return false;

  if (topic.startsWith(prefix)) return true;

  const initials = topic
    .split('-')
    .filter(Boolean)
    .map((word) => word[0])
    .join('');

  return initials.length >= 2 && initials === prefix;
}

function humanize(value: string): string {
  return value.replace(/-+/g, ' ').trim();
}

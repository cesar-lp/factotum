import { describe, it, expect } from 'vitest';
import {
  decideRoute, focusHash, noteHash, resumesSuspendedSession, retainsSuspendedSession,
  type DashboardState, type RouteDecision
} from '../src/route.js';
import type { TopicSummary } from '../src/topics.js';
import type { StoredCard } from '../src/db/schema.js';

const card = (id: string): StoredCard => ({
  id, format: 'qa', topic: 'net', category: 'net', tags: [], prompt: id, answer: 'a',
  source: { path: 'vault/a.md', block: id }, citations: [], tombstoned: false
});

const topics = (...categories: string[]): TopicSummary[] => [
  { topic: 'net', categories: categories.map((category) => ({ category, dueCount: 1, newCount: 0 })) }
];

const state = (
  session: StoredCard[],
  extension: StoredCard[],
  topicList: TopicSummary[] = []
): DashboardState => ({
  session,
  extension,
  newCardsSeenToday: 0,
  // Routing never reads these; they ride along on DashboardState because the
  // dashboard renders them from the same load.
  streak: 0,
  lastSevenDays: [],
  topics: topicList
});

describe('decideRoute', () => {
  it('sends #review-extend with due cards present back to the dashboard', () => {
    // THE invariant: due cards always come first, so a non-empty session
    // must never let #review-extend through, no matter how the hash was
    // reached (stale history, reload, bookmark).
    const s = state([card('due-1')], [card('new-1')]);
    expect(decideRoute('#review-extend', s)).toEqual({ kind: 'dashboard' });
  });

  it('sends #review-extend with an empty queue and extension cards to review-extend', () => {
    const s = state([], [card('new-1')]);
    expect(decideRoute('#review-extend', s)).toEqual({ kind: 'review-extend' });
  });

  it('sends #review-extend with an empty queue and nothing to extend into back to the dashboard', () => {
    const s = state([], []);
    expect(decideRoute('#review-extend', s)).toEqual({ kind: 'dashboard' });
  });

  it('sends #review with due cards to review', () => {
    const s = state([card('due-1')], []);
    expect(decideRoute('#review', s)).toEqual({ kind: 'review' });
  });

  it('sends #review with an empty session back to the dashboard', () => {
    const s = state([], [card('new-1')]);
    expect(decideRoute('#review', s)).toEqual({ kind: 'dashboard' });
  });

  it('sends #settings to settings regardless of state', () => {
    const s = state([], []);
    expect(decideRoute('#settings', s)).toEqual({ kind: 'settings' });
  });

  it('sends an unknown hash to the dashboard', () => {
    const s = state([card('due-1')], [card('new-1')]);
    expect(decideRoute('#nonsense', s)).toEqual({ kind: 'dashboard' });
  });

  it('sends an empty hash to the dashboard', () => {
    const s = state([card('due-1')], [card('new-1')]);
    expect(decideRoute('', s)).toEqual({ kind: 'dashboard' });
  });

  it('sends #topics to topics regardless of state', () => {
    expect(decideRoute('#topics', state([card('due-1')], []))).toEqual({ kind: 'topics' });
    expect(decideRoute('#topics', state([], []))).toEqual({ kind: 'topics' });
  });

  it('sends #focus/<category> to focus, carrying the category', () => {
    const s = state([], [], topics('amp'));
    expect(decideRoute('#focus/amp', s)).toEqual({ kind: 'focus', category: 'amp' });
  });

  it('allows focus even when due cards are waiting — it is an extra, not a fallback', () => {
    const s = state([card('due-1')], [], topics('amp'));
    expect(decideRoute('#focus/amp', s)).toEqual({ kind: 'focus', category: 'amp' });
  });

  it('decodes a percent-encoded category', () => {
    const s = state([], [], topics('data systems'));
    expect(decideRoute('#focus/data%20systems', s))
      .toEqual({ kind: 'focus', category: 'data systems' });
  });

  it('sends a stale #focus for an unknown category back to the dashboard', () => {
    expect(decideRoute('#focus/gone', state([], [], topics('amp'))))
      .toEqual({ kind: 'dashboard' });
  });

  it('sends #focus for a category with nothing to serve back to the dashboard', () => {
    const empty: TopicSummary[] = [
      { topic: 'net', categories: [{ category: 'amp', dueCount: 0, newCount: 0 }] }
    ];
    expect(decideRoute('#focus/amp', state([], [], empty))).toEqual({ kind: 'dashboard' });
  });

  it('sends a bare #focus/ with no category back to the dashboard', () => {
    expect(decideRoute('#focus/', state([], [], topics('amp')))).toEqual({ kind: 'dashboard' });
  });

  it('sends a malformed percent-escape back to the dashboard instead of throwing', () => {
    expect(decideRoute('#focus/%E0%A4%A', state([], [], topics('amp'))))
      .toEqual({ kind: 'dashboard' });
  });
});

describe('decideRoute with a suspended session', () => {
  it('resumes #review even though a freshly built session would be empty', () => {
    // THE case this exists for: the reader graded everything, one card was
    // re-queued in-session (so it is scheduled minutes out and no rebuild
    // sees it as due), then detoured to a note. Rebuilding would hand back
    // an empty session and eject them to the dashboard mid-session.
    expect(decideRoute('#review', state([], []), '#review')).toEqual({ kind: 'resume' });
  });

  it('resumes #review-extend', () => {
    expect(decideRoute('#review-extend', state([], []), '#review-extend'))
      .toEqual({ kind: 'resume' });
  });

  it('resumes a focus session, without needing the category to still be servable', () => {
    expect(decideRoute('#focus/amp', state([], [], topics()), '#focus/amp'))
      .toEqual({ kind: 'resume' });
  });

  it('only resumes the exact route the session was started from', () => {
    // A suspended #review must not turn #review-extend into a resume, nor
    // survive a trip to any other screen.
    const s = state([], [card('new-1')]);
    expect(decideRoute('#review-extend', s, '#review')).toEqual({ kind: 'review-extend' });
    expect(decideRoute('#topics', s, '#review')).toEqual({ kind: 'topics' });
    expect(decideRoute('', s, '#review')).toEqual({ kind: 'dashboard' });
  });

  it('still routes the note detour to the note, not to a resume', () => {
    // The whole point: the note has to render while the session waits.
    expect(decideRoute(noteHash('vault/a.md', 'card-ab12'), state([], []), '#review'))
      .toEqual({ kind: 'note', path: 'vault/a.md', cardId: 'card-ab12' });
  });

  it('never invents a resume for a non-session route', () => {
    // Belt and braces: a retention record can only ever name a session
    // route, but a bad one must degrade to normal guarded routing.
    expect(decideRoute('#settings', state([], []), '#settings')).toEqual({ kind: 'settings' });
    expect(decideRoute('#topics', state([], []), '#topics')).toEqual({ kind: 'topics' });
  });

  it('leaves every guard exactly as it was when nothing is suspended', () => {
    // The invariant above, restated against the new parameter: passing null
    // (or omitting it) must not change a single decision.
    const s = state([card('due-1')], [card('new-1')]);
    expect(decideRoute('#review-extend', s, null)).toEqual({ kind: 'dashboard' });
    expect(decideRoute('#review', state([], []), null)).toEqual({ kind: 'dashboard' });
  });
});

describe('retainsSuspendedSession', () => {
  // THE anti-resurrection rule, and the one thing main.ts's session
  // retention rests on that decideRoute cannot see (it is handed
  // suspendedHash already computed). Typed as a total Record over the
  // union, so adding a RouteDecision kind without deciding whether it keeps
  // a running session alive fails to compile here rather than shipping as
  // either a dropped session or a resurrected one.
  const expected: Record<RouteDecision['kind'], boolean> = {
    // The detour the note viewer exists to make survivable, and the return
    // trip from it.
    note: true,
    resume: true,
    // Every other destination means the reader has left for good.
    review: false,
    'review-extend': false,
    focus: false,
    topics: false,
    settings: false,
    dashboard: false
  };

  for (const [kind, retains] of Object.entries(expected)) {
    it(`${retains ? 'keeps' : 'ends'} a suspended session on '${kind}'`, () => {
      expect(retainsSuspendedSession(kind as RouteDecision['kind'])).toBe(retains);
    });
  }

  it('agrees with decideRoute about every kind it can return', () => {
    // The two halves of the rule must not drift: whatever decideRoute calls
    // a resume, this must classify as retaining, or main.ts's fast path and
    // its cleanup would disagree about the same navigation.
    expect(retainsSuspendedSession(decideRoute('#review', state([], []), '#review').kind)).toBe(true);
    expect(retainsSuspendedSession(decideRoute(noteHash('vault/a.md'), state([], [])).kind)).toBe(true);
    expect(retainsSuspendedSession(decideRoute('', state([], [])).kind)).toBe(false);
  });
});

describe('resumesSuspendedSession', () => {
  it('is exactly the condition decideRoute returns `resume` for', () => {
    // main.ts calls this directly to short-circuit the return trip ahead of
    // a DashboardState load it would not use, so the two must not drift.
    const cases: [string, string | null][] = [
      ['#review', '#review'],
      ['#review-extend', '#review-extend'],
      ['#focus/amp', '#focus/amp'],
      ['#review', '#review-extend'],
      ['#topics', '#review'],
      ['#settings', '#settings'],
      ['#topics', '#topics'],
      [noteHash('vault/a.md'), '#review'],
      ['#review', null],
      ['', null]
    ];
    for (const [hash, suspended] of cases) {
      expect([hash, resumesSuspendedSession(hash, suspended)]).toEqual([
        hash,
        decideRoute(hash, state([], [], topics('amp')), suspended).kind === 'resume'
      ]);
    }
  });
});

describe('focusHash', () => {
  it('round-trips a category containing characters that need encoding', () => {
    const s = state([], [], topics('data systems'));
    expect(decideRoute(focusHash('data systems'), s))
      .toEqual({ kind: 'focus', category: 'data systems' });
  });
});

describe('#note routing', () => {
  const s = () => state([], []);

  it('routes a note hash to the note screen', () => {
    expect(decideRoute(noteHash('vault/db/consensus.md'), s()))
      .toEqual({ kind: 'note', path: 'vault/db/consensus.md', cardId: null });
  });

  it('carries an arrived-from card id', () => {
    expect(decideRoute(noteHash('vault/db/consensus.md', 'card-ubdh'), s()))
      .toEqual({ kind: 'note', path: 'vault/db/consensus.md', cardId: 'card-ubdh' });
  });

  it('splits on the LAST segment, since vault paths contain slashes', () => {
    // THE parsing hazard: 'vault/aws/iam/conditions.md' has three slashes
    // of its own, so the card id must be taken from the end, not the start.
    expect(decideRoute('#note/vault%2Faws%2Fiam%2Fconditions.md/card-ab12', s()))
      .toEqual({ kind: 'note', path: 'vault/aws/iam/conditions.md', cardId: 'card-ab12' });
  });

  it('treats a trailing segment that is not a card id as part of nothing', () => {
    // Only ^card-[a-z0-9]{4} is a card id. Anything else is not one, and the
    // whole remainder is the path.
    expect(decideRoute('#note/vault%2Fa.md', s()))
      .toEqual({ kind: 'note', path: 'vault/a.md', cardId: null });
  });

  it('falls back to the dashboard on a bare #note/', () => {
    expect(decideRoute('#note/', s())).toEqual({ kind: 'dashboard' });
  });

  it('falls back to the dashboard on a malformed percent-escape', () => {
    // decodeURIComponent throws a URIError on input like %E0%A4%A, and a
    // hash is plain client state that can arrive hand-edited.
    expect(decideRoute('#note/%E0%A4%A', s())).toEqual({ kind: 'dashboard' });
  });
});

describe('noteHash', () => {
  it('round-trips a path containing slashes', () => {
    const hash = noteHash('vault/aws/iam/conditions.md');
    expect(decideRoute(hash, state([], []))).toEqual({
      kind: 'note', path: 'vault/aws/iam/conditions.md', cardId: null
    });
  });
});

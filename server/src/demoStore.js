// In-memory mail store used when no IMAP/SMTP credentials are configured.
// Lets the app run fully offline so the UI can be developed and demoed.

const now = Date.now();
const min = 60 * 1000;
const hr = 60 * min;
const day = 24 * hr;

let idCounter = 1000;
const nextId = () => `demo-${idCounter++}`;

export const DEMO_ADDRESS = 'you@typewriter.email';

const t = (offset) => new Date(now - offset).toISOString();

export const demoState = {
  threads: [
    {
      id: 'th-naming',
      subject: 'Company name brainstorm',
      mailbox: 'inbox',
      starred: true,
      unread: false,
      messages: [
        {
          id: nextId(),
          from: { name: 'Greg Brockman', address: 'greg@example.com' },
          to: [{ name: 'You', address: DEMO_ADDRESS }],
          date: t(2 * day + 3 * hr),
          body: "On the name front, the best three we brainstormed last night:\n\n- Axon\n- AI Summer\n- Difference Engine\n\nCurious if any of those appeal (no worries if you think they are all bad :)).",
        },
        {
          id: nextId(),
          from: { name: 'You', address: DEMO_ADDRESS },
          to: [{ name: 'Greg Brockman', address: 'greg@example.com' }],
          date: t(2 * day + 1 * hr),
          body: "Not bad. Sounds kinda cute. Most people won't get the latin, but the ones we want to join will.\n\nI'd support that.",
        },
        {
          id: nextId(),
          from: { name: 'Greg Brockman', address: 'greg@example.com' },
          to: [{ name: 'You', address: DEMO_ADDRESS }],
          date: t(2 * day),
          body: "Great — locking it in. Announcement draft coming your way tomorrow.",
        },
      ],
    },
    {
      id: 'th-launch',
      subject: 'Launch timing',
      mailbox: 'inbox',
      starred: false,
      unread: true,
      messages: [
        {
          id: nextId(),
          from: { name: 'Mira Murati', address: 'mira@example.com' },
          to: [{ name: 'You', address: DEMO_ADDRESS }],
          date: t(5 * hr),
          body: "They've walked me through all the reasons and the issues with the current timeline. We need more time.",
        },
        {
          id: nextId(),
          from: { name: 'You', address: DEMO_ADDRESS },
          to: [{ name: 'Mira Murati', address: 'mira@example.com' }],
          date: t(4 * hr + 30 * min),
          body: "more time for what?",
        },
        {
          id: nextId(),
          from: { name: 'Mira Murati', address: 'mira@example.com' },
          to: [{ name: 'You', address: DEMO_ADDRESS }],
          date: t(3 * hr),
          body: "Infra isn't ready for the traffic we're projecting. Two more weeks and we ship something we're proud of.",
        },
      ],
    },
    {
      id: 'th-redlines',
      subject: 'Re: Proposed contract language',
      mailbox: 'inbox',
      starred: false,
      unread: true,
      messages: [
        {
          id: nextId(),
          from: { name: 'Dario Amodei', address: 'dario@example.com' },
          to: [{ name: 'You', address: DEMO_ADDRESS }],
          date: t(1 * day + 2 * hr),
          body: "Thanks for your message. I appreciate your efforts. Unfortunately, our read of the proposed language is that it appears to completely remove our redlines; the autonomy provision is fully undercut by the addition of \"as appropriate\".\n\nThis simply amounts to a blanket posture of \"anything goes\". I unfortunately don't see a way forward given these categorical statements.",
        },
      ],
    },
    {
      id: 'th-offsite',
      subject: 'Team offsite — dates',
      mailbox: 'archive',
      starred: false,
      unread: false,
      messages: [
        {
          id: nextId(),
          from: { name: 'Ilya S.', address: 'ilya@example.com' },
          to: [{ name: 'You', address: DEMO_ADDRESS }],
          date: t(6 * day),
          body: "Does the week of the 14th work for the offsite? Tahoe or Big Sur are both bookable.",
        },
        {
          id: nextId(),
          from: { name: 'You', address: DEMO_ADDRESS },
          to: [{ name: 'Ilya S.', address: 'ilya@example.com' }],
          date: t(6 * day - 2 * hr),
          body: "14th works. Big Sur, no contest.",
        },
      ],
    },
  ],
};

export function demoNewMessage({ from, to, body }) {
  return {
    id: nextId(),
    from,
    to,
    date: new Date().toISOString(),
    body,
  };
}

export function demoNewThread({ subject, message, mailbox = 'sent' }) {
  const thread = {
    id: `th-${idCounter++}`,
    subject,
    mailbox,
    starred: false,
    unread: false,
    messages: [message],
  };
  demoState.threads.unshift(thread);
  return thread;
}

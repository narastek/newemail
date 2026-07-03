// Real-mail backend: reads via IMAP, sends via SMTP.
// Activated when IMAP_HOST / IMAP_USER / IMAP_PASS env vars are present.

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

const cfg = {
  imap: {
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASS },
    logger: false,
  },
  smtp: {
    host: process.env.SMTP_HOST || process.env.IMAP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER || process.env.IMAP_USER,
      pass: process.env.SMTP_PASS || process.env.IMAP_PASS,
    },
  },
  address: process.env.MAIL_ADDRESS || process.env.IMAP_USER,
  fetchLimit: Number(process.env.FETCH_LIMIT || 200),
};

export const imapConfigured = Boolean(
  cfg.imap.host && cfg.imap.auth.user && cfg.imap.auth.pass
);

export const selfAddress = cfg.address;

const MAILBOX_PATHS = {
  inbox: 'INBOX',
  sent: process.env.SENT_MAILBOX || '[Gmail]/Sent Mail',
  archive: process.env.ARCHIVE_MAILBOX || '[Gmail]/All Mail',
};

function normalizeSubject(subject = '') {
  return subject.replace(/^((re|fwd?|fw)(\[\d+\])?:\s*)+/i, '').trim().toLowerCase();
}

async function withClient(fn) {
  const client = new ImapFlow(cfg.imap);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.logout().catch(() => {});
  }
}

function addr(a) {
  if (!a) return { name: '', address: '' };
  return { name: a.name || '', address: a.address || '' };
}

export async function fetchThreads(mailbox = 'inbox') {
  const path = MAILBOX_PATHS[mailbox] || 'INBOX';
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(path);
    try {
      const total = client.mailbox.exists;
      if (!total) return [];
      const start = Math.max(1, total - cfg.fetchLimit + 1);
      const messages = [];
      for await (const msg of client.fetch(`${start}:*`, {
        envelope: true,
        flags: true,
        uid: true,
        source: true,
      })) {
        const parsed = await simpleParser(msg.source);
        messages.push({
          id: `uid-${msg.uid}`,
          uid: msg.uid,
          from: addr(msg.envelope.from?.[0]),
          to: (msg.envelope.to || []).map(addr),
          date: (msg.envelope.date || new Date()).toISOString(),
          subject: msg.envelope.subject || '(no subject)',
          body: (parsed.text || parsed.html || '').trim(),
          unread: !msg.flags.has('\\Seen'),
          starred: msg.flags.has('\\Flagged'),
          messageId: msg.envelope.messageId,
        });
      }

      // Group into threads by normalized subject.
      const byKey = new Map();
      for (const m of messages) {
        const key = normalizeSubject(m.subject) || m.messageId;
        if (!byKey.has(key)) {
          byKey.set(key, {
            id: `th-${encodeURIComponent(key)}`,
            subject: m.subject.replace(/^((re|fwd?|fw)(\[\d+\])?:\s*)+/i, '') || '(no subject)',
            mailbox,
            starred: false,
            unread: false,
            messages: [],
          });
        }
        const th = byKey.get(key);
        th.messages.push(m);
        th.starred = th.starred || m.starred;
        th.unread = th.unread || m.unread;
      }
      const threads = [...byKey.values()];
      for (const th of threads) {
        th.messages.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
      threads.sort(
        (a, b) =>
          new Date(b.messages.at(-1).date) - new Date(a.messages.at(-1).date)
      );
      return threads;
    } finally {
      lock.release();
    }
  });
}

export async function markSeen(mailbox, uids) {
  const path = MAILBOX_PATHS[mailbox] || 'INBOX';
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(path);
    try {
      await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function setFlagged(mailbox, uids, flagged) {
  const path = MAILBOX_PATHS[mailbox] || 'INBOX';
  return withClient(async (client) => {
    const lock = await client.getMailboxLock(path);
    try {
      if (flagged) await client.messageFlagsAdd(uids, ['\\Flagged'], { uid: true });
      else await client.messageFlagsRemove(uids, ['\\Flagged'], { uid: true });
    } finally {
      lock.release();
    }
  });
}

let transporter;
export async function sendMail({ to, subject, body, inReplyTo }) {
  transporter ||= nodemailer.createTransport(cfg.smtp);
  await transporter.sendMail({
    from: cfg.address,
    to,
    subject,
    text: body,
    inReplyTo,
    references: inReplyTo,
  });
}

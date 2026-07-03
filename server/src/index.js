import express from 'express';
import cors from 'cors';
import {
  demoState,
  demoNewMessage,
  demoNewThread,
  DEMO_ADDRESS,
} from './demoStore.js';
import {
  imapConfigured,
  selfAddress,
  fetchThreads,
  markSeen,
  setFlagged,
  sendMail,
} from './imapService.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const MODE = imapConfigured ? 'imap' : 'demo';
const ADDRESS = imapConfigured ? selfAddress : DEMO_ADDRESS;

app.get('/api/config', (req, res) => {
  res.json({ mode: MODE, address: ADDRESS });
});

// ---- thread list ----
app.get('/api/threads', async (req, res) => {
  const mailbox = req.query.mailbox || 'inbox';
  try {
    if (MODE === 'imap') {
      const threads = await fetchThreads(mailbox);
      return res.json(threads);
    }
    const threads = demoState.threads
      .filter((t) => (mailbox === 'starred' ? t.starred : t.mailbox === mailbox))
      .map((t) => ({
        ...t,
        // list view only needs a preview of the last message
        messages: undefined,
        lastMessage: t.messages.at(-1),
        messageCount: t.messages.length,
      }))
      .sort(
        (a, b) => new Date(b.lastMessage.date) - new Date(a.lastMessage.date)
      );
    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---- full thread ----
app.get('/api/threads/:id', async (req, res) => {
  try {
    if (MODE === 'imap') {
      // In IMAP mode the client already has full threads from the list call;
      // re-fetch the mailbox and find the thread.
      const mailbox = req.query.mailbox || 'inbox';
      const threads = await fetchThreads(mailbox);
      const th = threads.find((t) => t.id === req.params.id);
      if (!th) return res.status(404).json({ error: 'not found' });
      const uids = th.messages.filter((m) => m.unread).map((m) => m.uid);
      if (uids.length) markSeen(mailbox, uids).catch(console.error);
      return res.json(th);
    }
    const th = demoState.threads.find((t) => t.id === req.params.id);
    if (!th) return res.status(404).json({ error: 'not found' });
    th.unread = false;
    res.json(th);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---- actions ----
app.post('/api/threads/:id/star', async (req, res) => {
  const { starred, mailbox = 'inbox' } = req.body;
  try {
    if (MODE === 'imap') {
      const threads = await fetchThreads(mailbox);
      const th = threads.find((t) => t.id === req.params.id);
      if (!th) return res.status(404).json({ error: 'not found' });
      await setFlagged(mailbox, th.messages.map((m) => m.uid), starred);
      return res.json({ ok: true });
    }
    const th = demoState.threads.find((t) => t.id === req.params.id);
    if (!th) return res.status(404).json({ error: 'not found' });
    th.starred = Boolean(starred);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/threads/:id/archive', (req, res) => {
  if (MODE === 'imap') {
    // v1: archive is a no-op over IMAP (Gmail keeps all mail in All Mail).
    return res.json({ ok: true });
  }
  const th = demoState.threads.find((t) => t.id === req.params.id);
  if (!th) return res.status(404).json({ error: 'not found' });
  th.mailbox = 'archive';
  res.json({ ok: true });
});

// ---- send ----
app.post('/api/send', async (req, res) => {
  const { to, subject, body, threadId } = req.body;
  if (!to || !body) return res.status(400).json({ error: 'to and body required' });
  try {
    if (MODE === 'imap') {
      await sendMail({ to, subject: subject || '(no subject)', body });
      return res.json({ ok: true });
    }
    const message = demoNewMessage({
      from: { name: 'You', address: ADDRESS },
      to: [{ name: '', address: to }],
      body,
    });
    if (threadId) {
      const th = demoState.threads.find((t) => t.id === threadId);
      if (!th) return res.status(404).json({ error: 'thread not found' });
      th.messages.push(message);
      return res.json({ ok: true, threadId: th.id });
    }
    const th = demoNewThread({ subject: subject || '(no subject)', message });
    res.json({ ok: true, threadId: th.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = Number(process.env.PORT || 8787);
app.listen(PORT, () => {
  console.log(`typewriter server listening on :${PORT} (mode: ${MODE})`);
});

import { useCallback, useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { api } from './api'
import type { AppConfig, Message, Thread, ThreadSummary } from './api'
import { colorMap } from './palette'
import './App.css'

const MAILBOXES = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'starred', label: 'Starred' },
  { id: 'archive', label: 'Archive' },
  { id: 'sent', label: 'Sent' },
]

function fmtTime(iso: string) {
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
  })
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function displayName(m: Message, self: string) {
  if (m.from.address.toLowerCase() === self.toLowerCase()) return 'You'
  return m.from.name || m.from.address
}

// ---------------- Thread view ----------------

function ThreadView({
  thread,
  self,
  onReply,
  onBack,
}: {
  thread: Thread
  self: string
  onReply: (body: string) => Promise<void>
  onBack: () => void
}) {
  const paperRef = useRef<HTMLDivElement>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [exporting, setExporting] = useState(false)

  const colors = colorMap(thread.messages.map((m) => m.from.address))

  const exportImage = async () => {
    if (!paperRef.current) return
    setExporting(true)
    try {
      const dataUrl = await toPng(paperRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        // the paper is centered with `margin: auto`; the computed pixel margin
        // would otherwise be cloned into the capture and shift the content
        style: { margin: '0' },
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${thread.subject.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`
      a.click()
    } finally {
      setExporting(false)
    }
  }

  const send = async () => {
    if (!reply.trim()) return
    setSending(true)
    try {
      await onReply(reply.trim())
      setReply('')
    } finally {
      setSending(false)
    }
  }

  let lastDay = ''

  return (
    <div className="thread-view">
      <div className="thread-toolbar">
        <button className="ghost" onClick={onBack}>
          ← Back
        </button>
        <div className="thread-toolbar-title">{thread.subject}</div>
        <button className="ghost" onClick={exportImage} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export as image'}
        </button>
      </div>

      <div className="thread-scroll">
        <div className="paper" ref={paperRef}>
          <h1 className="paper-subject">{thread.subject}</h1>
          {thread.messages.map((m) => {
            const day = fmtDay(m.date)
            const showDay = day !== lastDay
            lastDay = day
            return (
              <div key={m.id} className="msg">
                {showDay && <div className="day-divider">{day}</div>}
                <div
                  className="msg-sender"
                  style={{ color: colors[m.from.address.toLowerCase()] }}
                >
                  {displayName(m, self)}
                </div>
                <div className="msg-body">{m.body}</div>
                <div className="msg-time">{fmtTime(m.date)}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="reply-bar">
        <textarea
          placeholder="Reply…"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          rows={2}
        />
        <button className="primary" onClick={send} disabled={sending || !reply.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  )
}

// ---------------- Compose ----------------

function Compose({
  onClose,
  onSent,
}: {
  onClose: () => void
  onSent: () => void
}) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    setSending(true)
    setError('')
    try {
      await api.send({ to, subject, body })
      onSent()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="compose" onClick={(e) => e.stopPropagation()}>
        <div className="compose-header">
          <span>New message</span>
          <button className="ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <input
          placeholder="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          autoFocus
        />
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          placeholder="Write your message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
        />
        {error && <div className="error">{error}</div>}
        <div className="compose-footer">
          <button
            className="primary"
            onClick={send}
            disabled={sending || !to.trim() || !body.trim()}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------- App ----------------

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [mailbox, setMailbox] = useState('inbox')
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [active, setActive] = useState<Thread | null>(null)
  const [composing, setComposing] = useState(false)
  const [loading, setLoading] = useState(true)

  const self = config?.address ?? ''

  const loadThreads = useCallback(async (mb: string) => {
    setLoading(true)
    try {
      setThreads(await api.threads(mb))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    api.config().then(setConfig)
  }, [])

  useEffect(() => {
    setActive(null)
    loadThreads(mailbox)
  }, [mailbox, loadThreads])

  const openThread = async (t: ThreadSummary) => {
    const full = await api.thread(t.id, mailbox)
    setActive(full)
    setThreads((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, unread: false } : x))
    )
  }

  const toggleStar = async (t: ThreadSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    const starred = !t.starred
    setThreads((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, starred } : x))
    )
    await api.star(t.id, starred, mailbox)
    if (mailbox === 'starred') loadThreads(mailbox)
  }

  const archive = async (t: ThreadSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    await api.archive(t.id)
    setThreads((prev) => prev.filter((x) => x.id !== t.id))
  }

  const replyInThread = async (body: string) => {
    if (!active) return
    const other =
      active.messages.findLast(
        (m) => m.from.address.toLowerCase() !== self.toLowerCase()
      )?.from.address ??
      active.messages[0].to[0]?.address ??
      ''
    await api.send({
      to: other,
      subject: `Re: ${active.subject}`,
      body,
      threadId: active.id,
    })
    const full = await api.thread(active.id, mailbox)
    setActive(full)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          Typewriter<span className="logo-dot">.</span>
        </div>
        <button className="primary compose-btn" onClick={() => setComposing(true)}>
          Compose
        </button>
        <nav>
          {MAILBOXES.map((mb) => (
            <button
              key={mb.id}
              className={`nav-item ${mailbox === mb.id ? 'active' : ''}`}
              onClick={() => setMailbox(mb.id)}
            >
              {mb.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {config && (
            <>
              <div className="self-address">{config.address}</div>
              {config.mode === 'demo' && <div className="demo-badge">demo mode</div>}
            </>
          )}
        </div>
      </aside>

      <main className="main">
        {active ? (
          <ThreadView
            thread={active}
            self={self}
            onReply={replyInThread}
            onBack={() => {
              setActive(null)
              loadThreads(mailbox)
            }}
          />
        ) : (
          <div className="thread-list">
            {loading && <div className="empty">Loading…</div>}
            {!loading && threads.length === 0 && (
              <div className="empty">Nothing here.</div>
            )}
            {!loading &&
              threads.map((t) => {
                const last = t.lastMessage ?? t.messages?.at(-1)
                return (
                  <div
                    key={t.id}
                    className={`row ${t.unread ? 'unread' : ''}`}
                    onClick={() => openThread(t)}
                  >
                    <button
                      className={`star ${t.starred ? 'on' : ''}`}
                      onClick={(e) => toggleStar(t, e)}
                      title={t.starred ? 'Unstar' : 'Star'}
                    >
                      {t.starred ? '★' : '☆'}
                    </button>
                    <div className="row-main">
                      <div className="row-top">
                        <span className="row-sender">
                          {last ? displayName(last, self) : ''}
                        </span>
                        <span className="row-time">
                          {last ? fmtTime(last.date) : ''}
                        </span>
                      </div>
                      <div className="row-subject">{t.subject}</div>
                      <div className="row-preview">{last?.body}</div>
                    </div>
                    {mailbox === 'inbox' && (
                      <button
                        className="ghost row-archive"
                        onClick={(e) => archive(t, e)}
                        title="Archive"
                      >
                        ⌫
                      </button>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </main>

      {composing && (
        <Compose
          onClose={() => setComposing(false)}
          onSent={() => loadThreads(mailbox)}
        />
      )}
    </div>
  )
}

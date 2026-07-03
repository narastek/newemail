export interface Address {
  name: string
  address: string
}

export interface Message {
  id: string
  from: Address
  to: Address[]
  date: string
  body: string
}

export interface ThreadSummary {
  id: string
  subject: string
  mailbox: string
  starred: boolean
  unread: boolean
  lastMessage?: Message
  messageCount?: number
  messages?: Message[]
}

export interface Thread extends ThreadSummary {
  messages: Message[]
}

export interface AppConfig {
  mode: 'demo' | 'imap'
  address: string
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}

export const api = {
  config: () => req<AppConfig>('/api/config'),
  threads: (mailbox: string) =>
    req<ThreadSummary[]>(`/api/threads?mailbox=${encodeURIComponent(mailbox)}`),
  thread: (id: string, mailbox: string) =>
    req<Thread>(
      `/api/threads/${encodeURIComponent(id)}?mailbox=${encodeURIComponent(mailbox)}`
    ),
  star: (id: string, starred: boolean, mailbox: string) =>
    req(`/api/threads/${encodeURIComponent(id)}/star`, {
      method: 'POST',
      body: JSON.stringify({ starred, mailbox }),
    }),
  archive: (id: string) =>
    req(`/api/threads/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  send: (payload: {
    to: string
    subject?: string
    body: string
    threadId?: string
  }) =>
    req<{ ok: boolean; threadId?: string }>('/api/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

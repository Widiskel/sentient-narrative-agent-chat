import { motion } from 'framer-motion'
import type { ChatMessage } from '../../lib/types'
import { Markdown } from '../ui/Markdown'
import { useMemo } from 'react'

export function MessageBubble({ message, status }: { message: ChatMessage; status?: string }) {
  const isUser = message.role === 'user'
  const { badge, body } = useMemo(() => {
    if (isUser) return { badge: null as null | { label: string; tone: 'pos'|'neg'|'neu' }, body: message.content }
    const src = message.content || ''
    const htmlMatch = /<p[^>]*>\s*Overall\s*Sentiment\s*:\s*([^<]+?)\s*<\/p>/i.exec(src)
    const textMatch = /(^|\n)\s*Overall\s*Sentiment\s*:\s*([^\n<]+)\s*(?:\n|$)/i.exec(src)
    let rest = src
    let label: string | null = null
    if (htmlMatch) {
      label = htmlMatch[1].trim()
      rest = src.replace(htmlMatch[0], '').replace(/^\s+/, '')
    } else if (textMatch) {
      label = textMatch[2].trim()
      rest = src.replace(textMatch[0], textMatch[1] || '')
    }
    let tone: 'pos'|'neg'|'neu' = 'neu'
    const low = (label || '').toLowerCase()
    if (/(bull|positiv|green|up|gain|good)/.test(low)) tone = 'pos'
    else if (/(bear|negativ|red|down|loss|bad)/.test(low)) tone = 'neg'
    const badge = label ? { label, tone } : null
    return { badge, body: rest }
  }, [isUser, message.content])
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`max-w-full overflow-x-hidden break-words rounded-lg px-3 py-2 text-sm leading-relaxed ${
        isUser ? 'bg-white/10 self-end w-full sm:w-auto sm:max-w-[680px]' : 'bg-white/5 self-start w-full sm:w-auto sm:max-w-[680px]'
      }`}
    >
      {isUser ? (
        <div className="whitespace-pre-wrap text-white/90">{message.content}</div>
      ) : (
        <div className="text-white/90 space-y-2">
          {status ? (
            <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs text-white/70">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white/70" />
              <span>{status}</span>
            </div>
          ) : null}
          {badge ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                badge.tone === 'pos'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : badge.tone === 'neg'
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              Overall Sentiment: {badge.label}
            </span>
          ) : null}
          <Markdown>{body}</Markdown>
        </div>
      )}
    </motion.div>
  )
}

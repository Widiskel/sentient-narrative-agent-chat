'use client'

import React, { useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeHighlight from 'rehype-highlight'

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a || []),
      'href',
      'title',
      'target',
      'rel',
    ],
    code: [...(defaultSchema.attributes?.code || []), 'className'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className'],
    span: [...(defaultSchema.attributes?.span || []), 'className'],
    table: [...(defaultSchema.attributes?.table || []), 'className'],
    thead: [...(defaultSchema.attributes?.thead || []), 'className'],
    tbody: [...(defaultSchema.attributes?.tbody || []), 'className'],
    tr: [...(defaultSchema.attributes?.tr || []), 'className'],
    th: [...(defaultSchema.attributes?.th || []), 'className', 'colspan', 'rowspan'],
    td: [...(defaultSchema.attributes?.td || []), 'className', 'colspan', 'rowspan'],
  },
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  function PreWithCopy({ className, children, ...props }: any) {
    const ref = useRef<HTMLPreElement | null>(null)
    const onCopy = async () => {
      try {
        const text = ref.current?.textContent || ''
        await navigator.clipboard.writeText(text)
      } catch {}
    }
    return (
      <div className="relative my-2">
        <pre ref={ref} className={`overflow-x-auto rounded bg-black/50 p-2 text-sm ${className ?? ''}`} {...props}>{children}</pre>
        <button
          type="button"
          aria-label="Copy code"
          onClick={onCopy}
          className="absolute right-1 top-1 rounded bg-white/10 p-1 text-white/70 hover:bg-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M16 3.75H9A2.25 2.25 0 0 0 6.75 6v9A2.25 2.25 0 0 0 9 17.25h7A2.25 2.25 0 0 0 18.25 15V6A2.25 2.25 0 0 0 16 3.75z"/>
            <path d="M6 8.25H5A2.25 2.25 0 0 0 2.75 10.5v7A2.25 2.25 0 0 0 5 19.75h7A2.25 2.25 0 0 0 14.25 17.5V16.5H9A3.75 3.75 0 0 1 5.25 12.75V8.25z"/>
          </svg>
        </button>
      </div>
    )
  }
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeRaw], [rehypeSanitize, schema], [rehypeHighlight]]}
        components={{
          table: ({ className, ...props }) => (
            <div className="my-2 w-full overflow-x-auto">
              <table className={`table-auto w-max min-w-full border-collapse text-sm ${className ?? ''}`} {...props} />
            </div>
          ),
          thead: ({ className, ...props }) => <thead className={`bg-white/10 ${className ?? ''}`} {...props} />,
          th: ({ className, ...props }) => <th className={`border border-white/15 px-2 py-1 text-left ${className ?? ''}`} {...props} />,
          td: ({ className, ...props }) => <td className={`border border-white/15 px-2 py-1 align-top ${className ?? ''}`} {...props} />,
          code: ({ className, children, ...props }) => (
            <code className={`rounded bg-white/10 px-1 py-0.5 ${className ?? ''}`} {...props}>{children}</code>
          ),
          pre: (props) => <PreWithCopy {...props} />,
          a: (props) => <a className="text-sky-400 hover:underline" target="_blank" rel="noreferrer" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

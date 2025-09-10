'use client'

import React from 'react'
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
          pre: ({ className, children, ...props }) => (
            <pre className={`my-2 overflow-x-auto rounded bg-black/50 p-2 text-sm ${className ?? ''}`} {...props}>{children}</pre>
          ),
          a: (props) => <a className="text-sky-400 hover:underline" target="_blank" rel="noreferrer" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

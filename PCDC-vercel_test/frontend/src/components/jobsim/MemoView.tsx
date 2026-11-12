import type { ReactNode } from "react"

import type { MemoNode } from "../../api/jobsim"

/** One run of text with its bold and italics. */
function TextRun({ node }: { node: MemoNode }) {
  let out: ReactNode = node.text ?? ""
  const marks = new Set((node.marks ?? []).map((mark) => mark.type))
  if (marks.has("italic")) out = <em>{out}</em>
  if (marks.has("bold")) out = <strong>{out}</strong>
  return <>{out}</>
}

function Children({ nodes }: { nodes?: MemoNode[] }) {
  return (
    <>
      {(nodes ?? []).map((child, index) => (
        <Block key={index} node={child} />
      ))}
    </>
  )
}

function Block({ node }: { node: MemoNode }) {
  switch (node.type) {
    case "text":
      return <TextRun node={node} />
    case "heading":
      return node.attrs?.level === 3 ? (
        <h4 className="mt-3 text-sm font-semibold text-[#111827]">
          <Children nodes={node.content} />
        </h4>
      ) : (
        <h3 className="mt-4 text-base font-semibold text-[#0b1d3a]">
          <Children nodes={node.content} />
        </h3>
      )
    case "paragraph":
      return (
        <p className="mt-2 min-h-[1em]">
          <Children nodes={node.content} />
        </p>
      )
    case "bulletList":
      return (
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <Children nodes={node.content} />
        </ul>
      )
    case "orderedList":
      return (
        <ol className="mt-2 list-decimal space-y-1 pl-6">
          <Children nodes={node.content} />
        </ol>
      )
    case "listItem":
      return (
        <li className="[&>p]:mt-0">
          <Children nodes={node.content} />
        </li>
      )
    default:
      // The server only stores the node types above.
      return null
  }
}

/** A student's memo, read-only, exactly as saved. */
export default function MemoView({ doc }: { doc: MemoNode | null }) {
  const hasText = JSON.stringify(doc ?? {}).includes('"text":')
  if (!doc || !hasText) {
    return <p className="text-sm italic text-[#6b7280]">The student didn't write anything.</p>
  }
  return (
    <div className="select-text text-sm leading-6 text-[#111827] [&>*:first-child]:mt-0">
      <Children nodes={doc.content} />
    </div>
  )
}

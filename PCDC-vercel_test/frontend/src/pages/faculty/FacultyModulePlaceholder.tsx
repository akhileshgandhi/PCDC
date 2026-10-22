import { ArrowLeft, Construction } from "lucide-react"
import { Link } from "react-router-dom"

import FacultyLayout from "../../layouts/FacultyLayout"

interface FacultyModulePlaceholderProps {
  title: string
  description: string
}

export default function FacultyModulePlaceholder({
  title,
  description,
}: FacultyModulePlaceholderProps) {
  return (
    <FacultyLayout>
      <section className="rounded-lg border border-[#e6e8eb] bg-white p-8 shadow-sm">
        <div className="grid max-w-2xl gap-5">
          <div className="grid size-12 place-items-center rounded-md bg-[#fff7df] text-[#92702a]">
            <Construction size={23} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-[#111827]">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#6b7280]">{description}</p>
          </div>
          <Link
            to="/faculty/dashboard"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-[#0b1d3a] px-4 py-3 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white"
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </section>
    </FacultyLayout>
  )
}

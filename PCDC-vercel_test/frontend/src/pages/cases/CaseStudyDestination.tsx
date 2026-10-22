import { ArrowLeft } from "lucide-react"
import { Link, useLocation, useParams } from "react-router-dom"

import DashboardLayout from "../../layouts/DashboardLayout"

function destinationLabel(pathname: string) {
  if (pathname.endsWith("/attempt")) return "Case Attempt"
  if (pathname.endsWith("/results")) return "Case Results"
  return "Case Detail"
}

export default function CaseStudyDestination() {
  const { caseStudyId } = useParams()
  const { pathname } = useLocation()
  const label = destinationLabel(pathname)

  return (
    <DashboardLayout>
      <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
        <Link
          to="/student/case-studies"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1D3A]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to My Case Studies
        </Link>
        <div className="mt-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#C9A227]">
            {label}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#111827]">
            Case Study {caseStudyId}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6B7280]">
            This route is ready for the next case study specification. The current feature only
            wires navigation from the case study list.
          </p>
        </div>
      </section>
    </DashboardLayout>
  )
}

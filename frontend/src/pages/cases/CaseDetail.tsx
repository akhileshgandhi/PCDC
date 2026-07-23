import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Target,
  UserCircle,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { getCaseDetail, startCaseAttempt, toCaseDomain, type CaseDetail as CaseDetailData } from "../../api/cases"
import DifficultyBadge from "../../components/cases/DifficultyBadge"
import DomainTag from "../../components/cases/DomainTag"
import DashboardLayout from "../../layouts/DashboardLayout"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function attemptAction(caseId: string, data: CaseDetailData) {
  const { attempt } = data

  if (attempt.status === "evaluated") {
    return {
      statusText: `Completed${attempt.total_score !== null ? ` - Score: ${attempt.total_score}/100` : ""}${
        attempt.grade_label ? ` (${attempt.grade_label})` : ""
      }`,
      to: `/student/case-studies/${caseId}/attempt`,
      buttonText: "View My Results",
      buttonClassName: "bg-white text-[#0B1D3A] hover:bg-[#F6F7F9]",
      icon: CheckCircle2,
    }
  }

  if (attempt.exists) {
    return {
      statusText: `In Progress - ${attempt.stage_label} (Stage ${attempt.stage}/6)`,
      to: `/student/case-studies/${caseId}/attempt`,
      buttonText: "Continue Attempt",
      buttonClassName: "bg-[#C9A227] text-white hover:bg-[#B08D20]",
      icon: Target,
    }
  }

  return {
    statusText: "Ready to Start",
    to: null,
    buttonText: "Start Attempt",
    buttonClassName: "bg-[#C9A227] text-white hover:bg-[#B08D20]",
    icon: Target,
  }
}

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<CaseDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (!id) return
    let isMounted = true

    async function load() {
      setIsLoading(true)
      try {
        const detail = await getCaseDetail(id!)
        if (isMounted) {
          setData(detail)
          setError("")
        }
      } catch {
        if (isMounted) {
          setError("Unable to load this case study. It may not be assigned to you.")
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [id])

  async function handleStartAttempt() {
    if (!id) return
    setIsStarting(true)
    try {
      await startCaseAttempt(id)
      navigate(`/student/case-studies/${id}/attempt`)
    } catch {
      setError("Unable to start this attempt right now. Please try again.")
      setIsStarting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-[#E6EBEB] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-sm font-medium text-[#6B7280]">Loading case study...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="space-y-5">
          <Link
            to="/student/case-studies"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1D3A] transition hover:text-[#C9A227]"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            My Case Studies
          </Link>
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-5 py-8 text-center text-sm font-medium text-[#B91C1C]">
            {error || "Case study not found."}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const { case: caseContent, attempt } = data
  const action = attemptAction(id!, data)
  const ActionIcon = action.icon

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <Link
          to="/student/case-studies"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1D3A] transition hover:text-[#C9A227]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          My Case Studies
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,65%)_minmax(320px,35%)]">
          <main className="space-y-5">
            <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <DomainTag domain={toCaseDomain(caseContent.domain)} />
                <DifficultyBadge level={caseContent.difficulty} />
              </div>

              <h1 className="mt-5 text-[28px] font-semibold leading-tight text-[#0B1D3A]">
                {caseContent.title}
              </h1>
              {caseContent.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">
                  {caseContent.description}
                </p>
              ) : null}

              <div className="mt-6 grid gap-3 text-sm font-medium text-[#6B7280] sm:grid-cols-3">
                <MetaItem
                  icon={Clock3}
                  label={`Estimated time: ${caseContent.estimated_minutes} minutes`}
                />
                <MetaItem
                  icon={CalendarDays}
                  label={`Added: ${formatDate(caseContent.created_at)}`}
                />
                <MetaItem
                  icon={UserCircle}
                  label={`Created by: ${caseContent.created_by_name || "PCDC Faculty"}`}
                />
              </div>
            </section>

            <ContentSection title="The Situation">
              <div className="max-w-[680px] whitespace-pre-line text-sm leading-[1.8] text-[#374151]">
                {caseContent.situation || "Case content is being finalized."}
              </div>
            </ContentSection>

            {caseContent.learning_outcomes.length > 0 ? (
              <ContentSection title="What You Will Develop">
                <ul className="space-y-3">
                  {caseContent.learning_outcomes.map((outcome) => (
                    <li key={outcome} className="flex gap-3 text-sm leading-6 text-[#374151]">
                      <CheckCircle2
                        className="mt-0.5 shrink-0 text-[#C9A227]"
                        size={18}
                        aria-hidden="true"
                      />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </ContentSection>
            ) : null}

            {caseContent.reflection_questions.length > 0 ? (
              <ContentSection title="You Will Be Asked To Reflect On">
                <ol className="space-y-3">
                  {caseContent.reflection_questions.map((question, index) => (
                    <li
                      key={question}
                      className="flex gap-3 text-sm italic leading-6 text-[#6B7280]"
                    >
                      <span className="font-semibold text-[#0B1D3A]">{index + 1}.</span>
                      <span>{question}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-5 rounded-lg bg-[#F6F7F9] px-4 py-3 text-sm font-medium text-[#6B7280]">
                  These questions appear after your AI discussion.
                </p>
              </ContentSection>
            ) : null}
          </main>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-xl bg-[#0B1D3A] p-6 text-white shadow-sm">
              <h2 className="text-xl font-semibold">Your Attempt</h2>

              <div className="mt-6 space-y-4 text-sm">
                <InfoRow icon={Clock3} text={`${caseContent.estimated_minutes} minutes`} />
                <InfoRow
                  icon={BarChart3}
                  text={`Level ${caseContent.difficulty}${
                    caseContent.difficulty_label ? ` - ${caseContent.difficulty_label}` : ""
                  }`}
                />
                <InfoRow icon={Target} text="One attempt only" />
              </div>

              <div className="mt-6 rounded-lg border border-white/15 bg-white/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 shrink-0 text-[#C9A227]" size={18} />
                  <p className="text-sm leading-6 text-white/88">
                    Read the full case before starting. You cannot restart once begun.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm font-semibold">
                <ActionIcon size={18} aria-hidden="true" />
                <span>{action.statusText}</span>
              </div>

              {action.to ? (
                <Link
                  to={action.to}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${action.buttonClassName}`}
                >
                  {action.buttonText}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleStartAttempt}
                  disabled={isStarting}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${action.buttonClassName}`}
                >
                  {isStarting ? "Starting..." : action.buttonText}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </section>

            {caseContent.capabilities.length > 0 ? (
              <TagCard title="Capabilities Assessed" tags={caseContent.capabilities} />
            ) : null}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}

interface MetaItemProps {
  icon: LucideIcon
  label: string
}

function MetaItem({ icon: Icon, label }: MetaItemProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="shrink-0 text-[#0B1D3A]" size={17} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

interface ContentSectionProps {
  title: string
  children: ReactNode
}

function ContentSection({ title, children }: ContentSectionProps) {
  return (
    <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">{title}</h2>
      {children}
    </section>
  )
}

interface InfoRowProps {
  icon: LucideIcon
  text: string
}

function InfoRow({ icon: Icon, text }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="shrink-0 text-[#C9A227]" size={18} aria-hidden="true" />
      <span className="leading-6 text-white/90">{text}</span>
    </div>
  )
}

interface TagCardProps {
  title: string
  tags: string[]
}

function TagCard({ title, tags }: TagCardProps) {
  return (
    <section className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[#C9A227] px-3 py-1 text-xs font-semibold text-[#0B1D3A]"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  )
}

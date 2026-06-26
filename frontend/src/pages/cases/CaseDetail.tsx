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
import { Link } from "react-router-dom"

import DifficultyBadge from "../../components/cases/DifficultyBadge"
import DomainTag, { type CaseDomain } from "../../components/cases/DomainTag"
import type { CaseStatus } from "../../components/cases/StatusBadge"
import DashboardLayout from "../../layouts/DashboardLayout"

interface CaseDetailData {
  id: number
  title: string
  description: string
  domain: CaseDomain
  difficulty: number
  estimated_minutes: number
  status: CaseStatus
  current_stage: number
  created_by: string
  created_at: string
  learning_outcomes: string[]
  reflection_questions: string[]
  career_tracks: string[]
  capabilities: string[]
}

const mockCaseDetail: CaseDetailData = {
  id: 1,
  title: "Q3 Market Entry Strategy",
  description: `ABC Electronics, a mid-sized consumer electronics company,
    has seen a 25% revenue decline over the past two quarters in Southeast
    Asia. The company faces stiff competition from Chinese OEMs, a weakening
    distribution network, and shifting consumer preferences toward
    premium-segment products.

    As the newly appointed Strategy Head, you have been tasked with
    developing a comprehensive market re-entry plan. You have access to
    financial reports, customer feedback data, and competitor analysis.
    The board expects a presentation in 45 minutes.`,
  domain: "Business",
  difficulty: 3,
  estimated_minutes: 45,
  status: "in_progress",
  current_stage: 3,
  created_by: "Dr. Ananya Rao",
  created_at: "2025-06-20",
  learning_outcomes: [
    "Apply strategic frameworks to diagnose business decline",
    "Evaluate trade-offs in market re-entry strategies",
    "Develop data-driven recommendations under time pressure",
    "Anticipate competitive responses to strategic decisions",
  ],
  reflection_questions: [
    "What assumptions did you make that could be challenged?",
    "How did your thinking evolve after the AI discussion?",
    "What would you do differently with more information?",
  ],
  career_tracks: ["Consulting", "Marketing"],
  capabilities: ["Strategic Thinking", "Decision Making", "Analytical Thinking"],
}

const shortDescription =
  "A consumer electronics company faces declining market share in Southeast Asia. As the Strategy Head, develop a market re-entry plan."

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`))
}

function attemptAction(caseDetail: CaseDetailData) {
  if (caseDetail.status === "completed") {
    return {
      statusText: "Attempt Completed",
      to: `/case-studies/${caseDetail.id}/results`,
      buttonText: "View My Results",
      buttonClassName: "bg-white text-[#0B1D3A] hover:bg-[#F6F7F9]",
      icon: CheckCircle2,
    }
  }

  if (caseDetail.status === "in_progress") {
    return {
      statusText: `In Progress - Stage ${caseDetail.current_stage}/6`,
      to: `/case-studies/${caseDetail.id}/attempt`,
      buttonText: "Continue Attempt",
      buttonClassName: "bg-[#C9A227] text-white hover:bg-[#B08D20]",
      icon: Target,
    }
  }

  return {
    statusText: "Ready to Start",
    to: `/case-studies/${caseDetail.id}/attempt`,
    buttonText: "Start My Attempt",
    buttonClassName: "bg-[#C9A227] text-white hover:bg-[#B08D20]",
    icon: Target,
  }
}

export default function CaseDetail() {
  const action = attemptAction(mockCaseDetail)
  const ActionIcon = action.icon

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <Link
          to="/case-studies"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1D3A] transition hover:text-[#C9A227]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          My Case Studies
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,65%)_minmax(320px,35%)]">
          <main className="space-y-5">
            <section className="rounded-xl border border-[#E6EBEB] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <DomainTag domain={mockCaseDetail.domain} />
                <DifficultyBadge level={mockCaseDetail.difficulty} />
              </div>

              <h1 className="mt-5 text-[28px] font-semibold leading-tight text-[#0B1D3A]">
                {mockCaseDetail.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">
                {shortDescription}
              </p>

              <div className="mt-6 grid gap-3 text-sm font-medium text-[#6B7280] sm:grid-cols-3">
                <MetaItem
                  icon={Clock3}
                  label={`Estimated time: ${mockCaseDetail.estimated_minutes} minutes`}
                />
                <MetaItem
                  icon={CalendarDays}
                  label={`Added: ${formatDate(mockCaseDetail.created_at)}`}
                />
                <MetaItem icon={UserCircle} label={`Created by: ${mockCaseDetail.created_by}`} />
              </div>
            </section>

            <ContentSection title="The Situation">
              <div className="max-w-[680px] whitespace-pre-line text-sm leading-[1.8] text-[#374151]">
                {mockCaseDetail.description}
              </div>
            </ContentSection>

            <ContentSection title="What You Will Develop">
              <ul className="space-y-3">
                {mockCaseDetail.learning_outcomes.map((outcome) => (
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

            <ContentSection title="You Will Be Asked To Reflect On">
              <ol className="space-y-3">
                {mockCaseDetail.reflection_questions.map((question, index) => (
                  <li key={question} className="flex gap-3 text-sm italic leading-6 text-[#6B7280]">
                    <span className="font-semibold text-[#0B1D3A]">{index + 1}.</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-lg bg-[#F6F7F9] px-4 py-3 text-sm font-medium text-[#6B7280]">
                These questions appear after your AI discussion.
              </p>
            </ContentSection>
          </main>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-xl bg-[#0B1D3A] p-6 text-white shadow-sm">
              <h2 className="text-xl font-semibold">Your Attempt</h2>

              <div className="mt-6 space-y-4 text-sm">
                <InfoRow icon={Clock3} text={`${mockCaseDetail.estimated_minutes} minutes`} />
                <InfoRow
                  icon={BarChart3}
                  text={`Level ${mockCaseDetail.difficulty} - Decision Making`}
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

              <Link
                to={action.to}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${action.buttonClassName}`}
              >
                {action.buttonText}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </section>

            <TagCard title="Capabilities Assessed" variant="outline" tags={mockCaseDetail.capabilities} />
            <TagCard title="Relevant Career Tracks" variant="filled" tags={mockCaseDetail.career_tracks} />
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
  variant: "outline" | "filled"
}

function TagCard({ title, tags, variant }: TagCardProps) {
  return (
    <section className="rounded-xl border border-[#E6EBEB] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className={
              variant === "outline"
                ? "rounded-full border border-[#C9A227] px-3 py-1 text-xs font-semibold text-[#0B1D3A]"
                : "rounded-full bg-[#0B1D3A] px-3 py-1 text-xs font-semibold text-white"
            }
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  )
}

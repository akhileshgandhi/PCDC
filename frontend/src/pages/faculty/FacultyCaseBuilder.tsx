import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  PenLine,
  Save,
  Send,
  Sparkles,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  createFacultyCase,
  generateFacultyCase,
  getFacultyCaseGenerationJob,
  getFacultyCapabilities,
  getFacultyCase,
  publishFacultyCase,
  updateFacultyCase,
  type CaseSectionKey,
  type CaseSectionMeta,
  type FacultyCapability,
  type FacultyCaseGenerationJob,
  type FacultyCaseEditor,
} from "../../api/faculty"
import FacultyLayout from "../../layouts/FacultyLayout"

type BuilderMode = "scratch" | "ai"

interface CoreFormState {
  title: string
  industry: string
  difficulty: string
  duration_minutes: string
  capabilities: string[]
  expected_outcomes: string
}

const industries = [
  "business",
  "technology",
  "healthcare",
  "environment",
  "geopolitics",
  "sports",
  "social",
  "science",
]

const sectionDefinitions: Array<{ key: CaseSectionKey; label: string; required?: boolean }> = [
  { key: "situation", label: "Situation", required: true },
  { key: "background", label: "Background" },
  { key: "data", label: "Data" },
  { key: "characters", label: "Characters" },
  { key: "constraints", label: "Constraints" },
  { key: "objectives", label: "Objectives", required: true },
  { key: "timeline", label: "Timeline", required: true },
  { key: "reflection_questions", label: "Reflection Questions", required: true },
  { key: "learning_outcomes", label: "Learning Outcomes" },
]

const arraySections = new Set<CaseSectionKey>(["reflection_questions", "learning_outcomes"])

const fallbackCapabilities: FacultyCapability[] = [
  "Communication",
  "Leadership",
  "Problem Solving",
  "Decision Making",
  "Innovation",
  "Strategic Thinking",
  "Entrepreneurship",
  "Professionalism",
].map((name, index) => ({ id: -(index + 1), name }))

const emptyCoreForm: CoreFormState = {
  title: "",
  industry: "business",
  difficulty: "3",
  duration_minutes: "45",
  capabilities: [],
  expected_outcomes: "",
}

export default function FacultyCaseBuilder() {
  const navigate = useNavigate()
  const { id } = useParams()
  const caseId = id ? Number(id) : null
  const [mode, setMode] = useState<BuilderMode | null>(caseId ? "scratch" : null)
  const [coreForm, setCoreForm] = useState<CoreFormState>(emptyCoreForm)
  const [capabilities, setCapabilities] = useState<FacultyCapability[]>([])
  const [caseData, setCaseData] = useState<FacultyCaseEditor | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState("")
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true)
  const [isLoading, setIsLoading] = useState(Boolean(caseId))
  const [isSaving, setIsSaving] = useState(false)
  const [generatingSection, setGeneratingSection] = useState<CaseSectionKey | "full" | null>(
    null,
  )
  const [generationJob, setGenerationJob] = useState<FacultyCaseGenerationJob | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const shouldOfferFullDraft = mode === "ai" && caseData && allSectionsEmpty(caseData)

  useEffect(() => {
    let isMounted = true

    async function loadCapabilities() {
      try {
        const data = await getFacultyCapabilities()
        if (isMounted) {
          setCapabilities(data.length > 0 ? data : fallbackCapabilities)
        }
      } catch {
        if (isMounted) {
          setCapabilities(fallbackCapabilities)
          setErrors(["Unable to load capabilities from the server. Showing default capabilities."])
        }
      } finally {
        if (isMounted) {
          setIsLoadingCapabilities(false)
        }
      }
    }

    loadCapabilities()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadCase() {
      if (!caseId) {
        return
      }
      setIsLoading(true)
      try {
        const data = await getFacultyCase(caseId)
        if (isMounted) {
          setCaseData(data)
          setCoreForm(caseToCoreForm(data))
          setErrors([])
        }
      } catch {
        if (isMounted) {
          setErrors(["Unable to load this case study."])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCase()

    return () => {
      isMounted = false
    }
  }, [caseId])

  useEffect(() => {
    if (
      !caseData ||
      !generationJob ||
      !["queued", "in_progress"].includes(generationJob.status)
    ) {
      return
    }

    let isMounted = true
    const timer = window.setInterval(async () => {
      try {
        const job = await getFacultyCaseGenerationJob(caseData.id, generationJob.job_id)
        if (!isMounted) {
          return
        }
        setGenerationJob(job)
        if (job.status === "succeeded" && job.case) {
          setCaseData(job.case)
          setCoreForm(caseToCoreForm(job.case))
          setGeneratingSection(null)
          setNotice(job.scope === "section" ? "Section generated." : "Case draft generated.")
          setErrors([])
        }
        if (job.status === "failed") {
          setGeneratingSection(null)
          setErrors([job.message || "AI generation failed. Existing content was preserved."])
        }
      } catch {
        if (isMounted) {
          setGeneratingSection(null)
          setErrors(["Unable to check generation status. Refresh and try again."])
        }
      }
    }, 2500)

    return () => {
      isMounted = false
      window.clearInterval(timer)
    }
  }, [caseData, generationJob])

  const publishBlockers = useMemo(() => {
    if (!caseData) {
      return []
    }
    const blockers: string[] = []
    if (!sectionValueToText(caseData.sections.situation).trim()) blockers.push("Situation")
    if (!sectionValueToText(caseData.sections.objectives).trim()) blockers.push("Objectives")
    if (!sectionValueToText(caseData.sections.timeline).trim()) blockers.push("Timeline")
    if (!sectionValueToText(caseData.sections.reflection_questions).trim()) {
      blockers.push("Reflection questions")
    }
    if (!caseData.rubric_exists) blockers.push("Rubric")
    return blockers
  }, [caseData])

  function updateCoreField(field: keyof CoreFormState, value: string) {
    setCoreForm((current) => ({ ...current, [field]: value }))
  }

  function toggleCapability(capabilityName: string) {
    setCoreForm((current) => ({
      ...current,
      capabilities: current.capabilities.includes(capabilityName)
        ? current.capabilities.filter((name) => name !== capabilityName)
        : [...current.capabilities, capabilityName],
    }))
  }

  function validateCoreForm() {
    const nextErrors: string[] = []
    if (!coreForm.title.trim()) nextErrors.push("Title is required.")
    if (!coreForm.industry.trim()) nextErrors.push("Industry is required.")
    if (!coreForm.difficulty) nextErrors.push("Difficulty is required.")
    if (!coreForm.duration_minutes || Number(coreForm.duration_minutes) < 1) {
      nextErrors.push("Duration must be at least 1 minute.")
    }
    if (coreForm.capabilities.length === 0) {
      nextErrors.push("Select at least one targeted capability.")
    }
    if (!coreForm.expected_outcomes.trim()) {
      nextErrors.push("Expected outcomes are required.")
    }
    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  async function handleCreateDraft() {
    if (!mode || !validateCoreForm()) {
      return
    }
    setIsSaving(true)
    setNotice("")
    try {
      const data = await createFacultyCase({
        title: coreForm.title,
        industry: coreForm.industry,
        difficulty: Number(coreForm.difficulty),
        duration_minutes: Number(coreForm.duration_minutes),
        capabilities: coreForm.capabilities,
        expected_outcomes: coreForm.expected_outcomes,
      })
      setCaseData(data)
      setErrors([])
      setNotice("Draft created.")
      navigate(`/faculty/case-builder/${data.id}`, { replace: true })
    } catch {
      setErrors(["Unable to create draft."])
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveDraft() {
    if (!caseData || !validateCoreForm()) {
      return
    }
    setIsSaving(true)
    setNotice("")
    try {
      const data = await updateFacultyCase(caseData.id, {
        title: coreForm.title,
        industry: coreForm.industry,
        difficulty: Number(coreForm.difficulty),
        duration_minutes: Number(coreForm.duration_minutes),
        capabilities: coreForm.capabilities,
        expected_outcomes: coreForm.expected_outcomes,
        sections: caseData.sections,
        section_meta: caseData.section_meta,
      })
      setCaseData(data)
      setCoreForm(caseToCoreForm(data))
      setErrors([])
      setNotice("Draft saved.")
    } catch {
      setErrors(["Unable to save draft."])
    } finally {
      setIsSaving(false)
    }
  }

  function updateSection(section: CaseSectionKey, value: string) {
    setCaseData((current) => {
      if (!current) return current
      const previousMeta = current.section_meta[section]
      const nextMeta: CaseSectionMeta = previousMeta === "ai_generated" ? "edited" : "manual"
      const nextValue = textToSectionValue(section, value)
      return {
        ...current,
        sections: { ...current.sections, [section]: nextValue },
        section_meta: { ...current.section_meta, [section]: value ? nextMeta : "manual" },
      }
    })
  }

  async function handleGenerate(section?: CaseSectionKey) {
    if (!caseData) {
      return
    }
    const target = section ?? "full"
    if (
      section &&
      caseData.section_meta[section] === "manual" &&
      sectionValueToText(caseData.sections[section]).trim() &&
      !window.confirm("This will overwrite your edits to this section. Continue?")
    ) {
      return
    }
    setGeneratingSection(target)
    setNotice("")
    try {
      const job = await generateFacultyCase(caseData.id, {
        scope: section ? "section" : "full",
        sections: section ? [section] : undefined,
        overwrite_manual: Boolean(section),
      })
      setGenerationJob(job)
      setErrors([])
      setNotice(job.message || "Generation queued.")
    } catch {
      setErrors(["AI generation failed. Existing content was preserved."])
      setGeneratingSection(null)
    }
  }

  async function handlePublish() {
    if (!caseData) {
      return
    }
    if (publishBlockers.length > 0) {
      setErrors([
        `Publish is blocked until these items are complete: ${publishBlockers.join(", ")}.`,
      ])
      return
    }
    setIsPublishing(true)
    setNotice("")
    try {
      const data = await publishFacultyCase(caseData.id)
      setCaseData(data)
      setNotice("Case published.")
      setErrors([])
    } catch {
      setErrors(["Unable to publish. Check required sections and rubric."])
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <FacultyLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/faculty/case-library"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#6b7280] transition hover:text-[#111827]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Case Library
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-[#111827]">Case Builder</h1>
          </div>

          {caseData ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#0b1d3a] px-4 py-3 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                Save Draft
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-4 py-3 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPublishing ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Send size={17} />
                )}
                Publish
              </button>
            </div>
          ) : null}
        </div>

        <Feedback errors={errors} notice={notice} />

        {isLoading ? (
          <section className="rounded-lg border border-[#e6e8eb] bg-white p-8 text-center text-sm font-medium text-[#6b7280] shadow-sm">
            Loading case builder...
          </section>
        ) : !mode ? (
          <EntryFork onSelect={setMode} />
        ) : !caseData ? (
          <CoreFieldsStep
            mode={mode}
            form={coreForm}
            capabilities={capabilities}
            isLoadingCapabilities={isLoadingCapabilities}
            isSaving={isSaving}
            onBack={() => setMode(null)}
            onFieldChange={updateCoreField}
            onCapabilityToggle={toggleCapability}
            onContinue={handleCreateDraft}
          />
        ) : (
          <EditorStep
            caseData={caseData}
            coreForm={coreForm}
            capabilities={capabilities}
            isLoadingCapabilities={isLoadingCapabilities}
            publishBlockers={publishBlockers}
            shouldOfferFullDraft={Boolean(shouldOfferFullDraft)}
            generatingSection={generatingSection}
            generationJob={generationJob}
            onFieldChange={updateCoreField}
            onCapabilityToggle={toggleCapability}
            onSectionChange={updateSection}
            onGenerate={handleGenerate}
          />
        )}
      </div>
    </FacultyLayout>
  )
}

interface EntryForkProps {
  onSelect: (mode: BuilderMode) => void
}

function EntryFork({ onSelect }: EntryForkProps) {
  return (
    <section className="grid gap-5 md:grid-cols-2">
      <EntryCard
        title="Start from Scratch"
        description="Build the case sections yourself, then optionally use AI section by section."
        icon={PenLine}
        onClick={() => onSelect("scratch")}
      />
      <EntryCard
        title="Generate with AI"
        description="Enter the core fields first, then let AI draft the full case for review."
        icon={Sparkles}
        onClick={() => onSelect("ai")}
      />
    </section>
  )
}

interface EntryCardProps {
  title: string
  description: string
  icon: typeof PenLine
  onClick: () => void
}

function EntryCard({ title, description, icon: Icon, onClick }: EntryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[#e6e8eb] bg-white p-6 text-left shadow-sm transition hover:border-[#c9a227] hover:shadow-md"
    >
      <span className="grid size-12 place-items-center rounded-md bg-[#fff7df] text-[#92702a]">
        <Icon size={23} aria-hidden="true" />
      </span>
      <span className="mt-6 block text-2xl font-semibold text-[#111827]">{title}</span>
      <span className="mt-3 block text-sm leading-6 text-[#6b7280]">{description}</span>
    </button>
  )
}

interface CoreFieldsStepProps {
  mode: BuilderMode
  form: CoreFormState
  capabilities: FacultyCapability[]
  isLoadingCapabilities: boolean
  isSaving: boolean
  onBack: () => void
  onFieldChange: (field: keyof CoreFormState, value: string) => void
  onCapabilityToggle: (capabilityName: string) => void
  onContinue: () => void
}

function CoreFieldsStep({
  mode,
  form,
  capabilities,
  isLoadingCapabilities,
  isSaving,
  onBack,
  onFieldChange,
  onCapabilityToggle,
  onContinue,
}: CoreFieldsStepProps) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Core Fields</h2>
          <p className="mt-1 text-sm text-[#6b7280]">
            {mode === "ai"
              ? "AI generation starts only after these fields are saved."
              : "These fields create the draft before the section editor opens."}
          </p>
        </div>
        <button type="button" onClick={onBack} className="text-sm font-semibold text-[#6b7280]">
          Change mode
        </button>
      </div>
      <CoreFieldsForm
        form={form}
        capabilities={capabilities}
        isLoadingCapabilities={isLoadingCapabilities}
        onFieldChange={onFieldChange}
        onCapabilityToggle={onCapabilityToggle}
      />
      <button
        type="button"
        onClick={onContinue}
        disabled={isSaving}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-[#c9a227] px-5 py-3 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#e0b84e] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? <Loader2 className="animate-spin" size={17} /> : <FileText size={17} />}
        Create Draft
      </button>
    </section>
  )
}

interface EditorStepProps {
  caseData: FacultyCaseEditor
  coreForm: CoreFormState
  capabilities: FacultyCapability[]
  isLoadingCapabilities: boolean
  publishBlockers: string[]
  shouldOfferFullDraft: boolean
  generatingSection: CaseSectionKey | "full" | null
  generationJob: FacultyCaseGenerationJob | null
  onFieldChange: (field: keyof CoreFormState, value: string) => void
  onCapabilityToggle: (capabilityName: string) => void
  onSectionChange: (section: CaseSectionKey, value: string) => void
  onGenerate: (section?: CaseSectionKey) => void
}

function EditorStep({
  caseData,
  coreForm,
  capabilities,
  isLoadingCapabilities,
  publishBlockers,
  shouldOfferFullDraft,
  generatingSection,
  generationJob,
  onFieldChange,
  onCapabilityToggle,
  onSectionChange,
  onGenerate,
}: EditorStepProps) {
  return (
    <div className="space-y-5">
      {caseData.status === "published" && caseData.active_attempts > 0 ? (
        <div className="rounded-lg border border-[#facc15] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
          {caseData.active_attempts} students have an active attempt on this case. Changes may
          affect their evaluation.
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Draft #{caseData.id}</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Status: <span className="font-semibold capitalize">{caseData.status}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGenerate()}
            disabled={generatingSection !== null}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0b1d3a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#17315c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generatingSection === "full" ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Bot size={17} />
            )}
            {shouldOfferFullDraft ? "Generate Full Case Draft" : "Generate Full Case"}
          </button>
        </div>
        {generationJob && ["queued", "in_progress"].includes(generationJob.status) ? (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1d4ed8]">
            <Loader2 className="animate-spin" size={17} aria-hidden="true" />
            {generationJob.status === "queued" ? "Generation queued." : "Generating case content."}
            The editor will refresh when it is ready.
          </div>
        ) : null}
        <CoreFieldsForm
          form={coreForm}
          capabilities={capabilities}
          isLoadingCapabilities={isLoadingCapabilities}
          onFieldChange={onFieldChange}
          onCapabilityToggle={onCapabilityToggle}
        />
      </section>

      {publishBlockers.length > 0 ? (
        <section className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] p-4 text-sm text-[#b42318]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <p className="font-semibold">Publish blockers</p>
              <p className="mt-1">Complete: {publishBlockers.join(", ")}.</p>
              {publishBlockers.includes("Rubric") ? (
                <Link
                  to={`/faculty/rubric-builder/${caseData.id}`}
                  className="mt-2 inline-flex font-semibold underline"
                >
                  Open rubric builder
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5">
        {sectionDefinitions.map((section) => (
          <SectionEditor
            key={section.key}
            sectionKey={section.key}
            label={section.label}
            required={section.required}
            value={sectionValueToText(caseData.sections[section.key])}
            meta={caseData.section_meta[section.key]}
            isGenerating={generatingSection === section.key}
            generationDisabled={generatingSection !== null}
            onChange={(value) => onSectionChange(section.key, value)}
            onGenerate={() => onGenerate(section.key)}
          />
        ))}
      </section>
    </div>
  )
}

interface CoreFieldsFormProps {
  form: CoreFormState
  capabilities: FacultyCapability[]
  isLoadingCapabilities: boolean
  onFieldChange: (field: keyof CoreFormState, value: string) => void
  onCapabilityToggle: (capabilityName: string) => void
}

function CoreFieldsForm({
  form,
  capabilities,
  isLoadingCapabilities,
  onFieldChange,
  onCapabilityToggle,
}: CoreFieldsFormProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <TextField
          label="Title"
          value={form.title}
          onChange={(value) => onFieldChange("title", value)}
        />
        <label className="grid gap-2 text-sm font-semibold text-[#111827]">
          Industry
          <select
            value={form.industry}
            onChange={(event) => onFieldChange("industry", event.target.value)}
            className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
          >
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {titleCase(industry)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-[#111827]">
          Difficulty
          <select
            value={form.difficulty}
            onChange={(event) => onFieldChange("difficulty", event.target.value)}
            className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label="Duration"
          type="number"
          value={form.duration_minutes}
          onChange={(value) => onFieldChange("duration_minutes", value)}
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#111827]">Capabilities Targeted</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {isLoadingCapabilities ? (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#6b7280]">
              <Loader2 className="animate-spin" size={16} aria-hidden="true" />
              Loading capabilities...
            </span>
          ) : null}
          {!isLoadingCapabilities && capabilities.length === 0 ? (
            <span className="text-sm font-medium text-[#b42318]">
              No capabilities are available.
            </span>
          ) : null}
          {!isLoadingCapabilities && capabilities.map((capability) => {
            const isSelected = form.capabilities.includes(capability.name)
            return (
              <button
                key={capability.id}
                type="button"
                onClick={() => onCapabilityToggle(capability.name)}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-[#0b1d3a] bg-[#0b1d3a] text-white"
                    : "border-[#e6e8eb] bg-white text-[#111827] hover:border-[#c9a227]"
                }`}
              >
                {capability.name}
              </button>
            )
          })}
        </div>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-[#111827]">
        Expected Outcomes
        <textarea
          value={form.expected_outcomes}
          onChange={(event) => onFieldChange("expected_outcomes", event.target.value)}
          rows={4}
          className="rounded-md border border-[#e6e8eb] bg-white px-3 py-3 text-sm font-medium leading-6 outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
        />
      </label>
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  type?: string
  onChange: (value: string) => void
}

function TextField({ label, value, type = "text", onChange }: TextFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
      />
    </label>
  )
}

interface SectionEditorProps {
  sectionKey: CaseSectionKey
  label: string
  required?: boolean
  value: string
  meta: CaseSectionMeta
  isGenerating: boolean
  generationDisabled: boolean
  onChange: (value: string) => void
  onGenerate: () => void
}

function SectionEditor({
  label,
  required,
  value,
  meta,
  isGenerating,
  generationDisabled,
  onChange,
  onGenerate,
}: SectionEditorProps) {
  return (
    <article className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-[#111827]">{label}</h3>
          {required ? (
            <span className="rounded-full bg-[#fff7df] px-2 py-1 text-xs font-semibold text-[#92702a]">
              Required
            </span>
          ) : null}
          <MetaBadge meta={meta} />
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generationDisabled}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#0b1d3a] px-3 py-2 text-sm font-semibold text-[#0b1d3a] transition hover:bg-[#0b1d3a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {value.trim() ? "Regenerate with AI" : "Generate with AI"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={7}
        className="w-full rounded-md border border-[#e6e8eb] bg-white px-3 py-3 text-sm font-medium leading-6 outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
      />
    </article>
  )
}

interface MetaBadgeProps {
  meta: CaseSectionMeta
}

function MetaBadge({ meta }: MetaBadgeProps) {
  const label =
    meta === "ai_generated" ? "AI-generated" : meta === "edited" ? "Edited" : "Manual"
  const className =
    meta === "ai_generated"
      ? "bg-[#eef4ff] text-[#3538cd]"
      : meta === "edited"
        ? "bg-[#ecfdf3] text-[#027a48]"
        : "bg-[#f2f4f7] text-[#475467]"

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>
}

interface FeedbackProps {
  errors: string[]
  notice: string
}

function Feedback({ errors, notice }: FeedbackProps) {
  if (errors.length > 0) {
    return (
      <div className="rounded-lg border border-[#f3c4c4] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b42318]">
        {errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
      </div>
    )
  }

  if (notice) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#027a48]">
        <CheckCircle2 size={17} aria-hidden="true" />
        {notice}
      </div>
    )
  }

  return null
}

function caseToCoreForm(caseData: FacultyCaseEditor): CoreFormState {
  return {
    title: caseData.title,
    industry: caseData.industry,
    difficulty: String(caseData.difficulty),
    duration_minutes: String(caseData.duration_minutes),
    capabilities: caseData.capabilities,
    expected_outcomes: caseData.expected_outcomes,
  }
}

function allSectionsEmpty(caseData: FacultyCaseEditor) {
  return sectionDefinitions.every(
    (section) => !sectionValueToText(caseData.sections[section.key]).trim(),
  )
}

function sectionValueToText(value: string | string[]) {
  return Array.isArray(value) ? value.join("\n") : value
}

function textToSectionValue(section: CaseSectionKey, value: string) {
  if (!arraySections.has(section)) {
    return value
  }
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

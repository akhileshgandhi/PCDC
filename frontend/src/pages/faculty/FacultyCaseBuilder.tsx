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
  getFacultyCourses,
  publishFacultyCase,
  updateFacultyCase,
  type CaseSectionKey,
  type CaseSectionMeta,
  type FacultyCapability,
  type FacultyCaseGenerationJob,
  type FacultyCaseEditor,
  type FacultyCaseInstructions,
  type FacultyCaseMarks,
  type FacultyCaseMetadata,
  type FacultyCaseQuestion,
  type FacultyCaseRecommendation,
  type FacultyCaseTiming,
  type FacultyCourseOption,
  type FacultyRapidFireQuestion,
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

const bloomsLevels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
const difficultyLabels = ["Foundation", "Regular", "Pro", "Expert", "Champion"]
const WRITTEN_QUESTION_COUNT = 3
const RAPID_FIRE_QUESTION_COUNT = 6

const emptyQuestion = (questionNumber: number): FacultyCaseQuestion => ({
  question_number: questionNumber,
  question_text: "",
  marks: 0,
  blooms_level: "",
  word_limit_min: null,
  word_limit_max: null,
  instructions: "",
  model_answer: "",
  alternative_answers: [],
  marking_scheme: "",
})

const emptyRapidFireQuestion = (sequence: number): FacultyRapidFireQuestion => ({
  sequence,
  question_text: "",
  answer_text: "",
})

function padQuestions(questions: FacultyCaseQuestion[]): FacultyCaseQuestion[] {
  const padded = [...questions]
  while (padded.length < WRITTEN_QUESTION_COUNT) {
    padded.push(emptyQuestion(padded.length + 1))
  }
  return padded.slice(0, WRITTEN_QUESTION_COUNT)
}

function padRapidFireQuestions(
  questions: FacultyRapidFireQuestion[],
): FacultyRapidFireQuestion[] {
  const padded = [...questions]
  while (padded.length < RAPID_FIRE_QUESTION_COUNT) {
    padded.push(emptyRapidFireQuestion(padded.length + 1))
  }
  return padded.slice(0, RAPID_FIRE_QUESTION_COUNT)
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function normalizeCaseData(data: FacultyCaseEditor): FacultyCaseEditor {
  return {
    ...data,
    questions: padQuestions(data.questions),
    rapid_fire_questions: padRapidFireQuestions(data.rapid_fire_questions),
  }
}

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
  const [courses, setCourses] = useState<FacultyCourseOption[]>([])
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
    getFacultyCourses()
      .then((data) => {
        if (isMounted) setCourses(data.items)
      })
      .catch(() => {
        if (isMounted) setCourses([])
      })
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
          setCaseData(normalizeCaseData(data))
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
          setCaseData(normalizeCaseData(job.case))
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
      setCaseData(normalizeCaseData(data))
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
        metadata: caseData.metadata,
        timing: caseData.timing,
        marks: caseData.marks,
        instructions: caseData.instructions,
        questions: caseData.questions,
        rapid_fire_questions: caseData.rapid_fire_questions,
        recommendation: caseData.recommendation,
      })
      setCaseData(normalizeCaseData(data))
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

  function updateMetadata<K extends keyof FacultyCaseMetadata>(
    field: K,
    value: FacultyCaseMetadata[K],
  ) {
    setCaseData((current) => {
      if (!current) return current
      return { ...current, metadata: { ...current.metadata, [field]: value } }
    })
  }

  function updateRecommendation<K extends keyof FacultyCaseRecommendation>(
    field: K,
    value: FacultyCaseRecommendation[K],
  ) {
    setCaseData((current) => {
      if (!current) return current
      return { ...current, recommendation: { ...current.recommendation, [field]: value } }
    })
  }

  function updateTiming<K extends keyof FacultyCaseTiming>(field: K, value: number | null) {
    setCaseData((current) => {
      if (!current) return current
      return { ...current, timing: { ...current.timing, [field]: value } }
    })
  }

  function updateMarks<K extends keyof FacultyCaseMarks>(field: K, value: number | null) {
    setCaseData((current) => {
      if (!current) return current
      return { ...current, marks: { ...current.marks, [field]: value } }
    })
  }

  function updateInstructions<K extends keyof FacultyCaseInstructions>(
    field: K,
    value: string,
  ) {
    setCaseData((current) => {
      if (!current) return current
      return { ...current, instructions: { ...current.instructions, [field]: value } }
    })
  }

  function updateQuestion<K extends keyof FacultyCaseQuestion>(
    index: number,
    field: K,
    value: FacultyCaseQuestion[K],
  ) {
    setCaseData((current) => {
      if (!current) return current
      const questions = [...current.questions]
      questions[index] = { ...questions[index], [field]: value }
      return { ...current, questions }
    })
  }

  function updateRapidFireQuestion<K extends keyof FacultyRapidFireQuestion>(
    index: number,
    field: K,
    value: FacultyRapidFireQuestion[K],
  ) {
    setCaseData((current) => {
      if (!current) return current
      const rapidFireQuestions = [...current.rapid_fire_questions]
      rapidFireQuestions[index] = { ...rapidFireQuestions[index], [field]: value }
      return { ...current, rapid_fire_questions: rapidFireQuestions }
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
      setCaseData(normalizeCaseData(data))
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
            onMetadataChange={updateMetadata}
            onTimingChange={updateTiming}
            onMarksChange={updateMarks}
            onInstructionsChange={updateInstructions}
            onQuestionChange={updateQuestion}
            onRapidFireChange={updateRapidFireQuestion}
            courses={courses}
            onRecommendationChange={updateRecommendation}
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
  onMetadataChange: <K extends keyof FacultyCaseMetadata>(
    field: K,
    value: FacultyCaseMetadata[K],
  ) => void
  onTimingChange: <K extends keyof FacultyCaseTiming>(field: K, value: number | null) => void
  onMarksChange: <K extends keyof FacultyCaseMarks>(field: K, value: number | null) => void
  onInstructionsChange: <K extends keyof FacultyCaseInstructions>(
    field: K,
    value: string,
  ) => void
  onQuestionChange: <K extends keyof FacultyCaseQuestion>(
    index: number,
    field: K,
    value: FacultyCaseQuestion[K],
  ) => void
  onRapidFireChange: <K extends keyof FacultyRapidFireQuestion>(
    index: number,
    field: K,
    value: FacultyRapidFireQuestion[K],
  ) => void
  courses: FacultyCourseOption[]
  onRecommendationChange: <K extends keyof FacultyCaseRecommendation>(
    field: K,
    value: FacultyCaseRecommendation[K],
  ) => void
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
  onMetadataChange,
  onTimingChange,
  onMarksChange,
  onInstructionsChange,
  onQuestionChange,
  onRapidFireChange,
  courses,
  onRecommendationChange,
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

      <MetadataPanel metadata={caseData.metadata} onChange={onMetadataChange} />

      <RecommendationPanel
        recommendation={caseData.recommendation}
        courses={courses}
        onChange={onRecommendationChange}
      />

      <TimingMarksPanel
        timing={caseData.timing}
        marks={caseData.marks}
        onTimingChange={onTimingChange}
        onMarksChange={onMarksChange}
      />

      <InstructionsPanel instructions={caseData.instructions} onChange={onInstructionsChange} />

      <QuestionsPanel questions={caseData.questions} onChange={onQuestionChange} />

      <RapidFirePanel
        questions={caseData.rapid_fire_questions}
        onChange={onRapidFireChange}
      />

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

interface NumberFieldProps {
  label: string
  value: number | null | undefined
  onChange: (value: number | null) => void
}

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      {label}
      <input
        type="number"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
      />
    </label>
  )
}

interface TextAreaFieldProps {
  label: string
  value: string
  rows?: number
  onChange: (value: string) => void
}

function TextAreaField({ label, value, rows = 3, onChange }: TextAreaFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="rounded-md border border-[#e6e8eb] bg-white px-3 py-3 text-sm font-medium leading-6 outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
      />
    </label>
  )
}

interface SelectFieldProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#111827]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border border-[#e6e8eb] bg-white px-3 text-sm font-medium outline-none transition focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20"
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

interface MetadataPanelProps {
  metadata: FacultyCaseMetadata
  onChange: <K extends keyof FacultyCaseMetadata>(field: K, value: FacultyCaseMetadata[K]) => void
}

function MetadataPanel({ metadata, onChange }: MetadataPanelProps) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Case Metadata</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Identity and classification fields used for case codes, filtering, and search.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TextField
          label="Case Code"
          value={metadata.case_code ?? ""}
          onChange={(value) => onChange("case_code", value)}
        />
        <TextField
          label="Volume"
          value={metadata.volume ?? ""}
          onChange={(value) => onChange("volume", value)}
        />
        <TextField
          label="Subject"
          value={metadata.subject ?? ""}
          onChange={(value) => onChange("subject", value)}
        />
        <TextField
          label="Functional Area"
          value={metadata.functional_area ?? ""}
          onChange={(value) => onChange("functional_area", value)}
        />
        <TextField
          label="Capability Category"
          value={metadata.capability_category ?? ""}
          onChange={(value) => onChange("capability_category", value)}
        />
        <SelectField
          label="Difficulty Label"
          value={metadata.difficulty_label ?? ""}
          options={difficultyLabels}
          onChange={(value) => onChange("difficulty_label", value)}
        />
        <TextField
          label="Target Learners"
          value={metadata.target_learners ?? ""}
          onChange={(value) => onChange("target_learners", value)}
        />
        <TextAreaField
          label="Bloom's Levels (one per line)"
          value={(metadata.blooms_levels ?? []).join("\n")}
          rows={3}
          onChange={(value) => onChange("blooms_levels", linesToList(value))}
        />
      </div>
    </section>
  )
}

const recommendableSemesters = Array.from({ length: 12 }, (_, index) => index + 1)

interface RecommendationPanelProps {
  recommendation: FacultyCaseRecommendation
  courses: FacultyCourseOption[]
  onChange: <K extends keyof FacultyCaseRecommendation>(
    field: K,
    value: FacultyCaseRecommendation[K],
  ) => void
}

function RecommendationPanel({ recommendation, courses, onChange }: RecommendationPanelProps) {
  function toggleSemester(semester: number) {
    const current = recommendation.recommended_semesters
    onChange(
      "recommended_semesters",
      current.includes(semester)
        ? current.filter((value) => value !== semester)
        : [...current, semester].sort((a, b) => a - b),
    )
  }

  function toggleCourse(courseId: number) {
    const current = recommendation.recommended_course_ids
    onChange(
      "recommended_course_ids",
      current.includes(courseId)
        ? current.filter((value) => value !== courseId)
        : [...current, courseId],
    )
  }

  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Recommended Course &amp; Semester</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Optional soft tags to help faculty find this case when browsing by course or semester.
        These do not restrict who can be assigned this case.
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Recommended Semesters</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendableSemesters.map((semester) => (
              <button
                key={semester}
                type="button"
                onClick={() => toggleSemester(semester)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  recommendation.recommended_semesters.includes(semester)
                    ? "border-[#c9a227] bg-[#fff7df] text-[#92702a]"
                    : "border-[#e6e8eb] text-[#6b7280] hover:border-[#c9a227]"
                }`}
              >
                Sem {semester}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111827]">Recommended Courses</p>
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-md border border-[#e6e8eb] p-3">
            {courses.length === 0 ? (
              <p className="text-sm text-[#6b7280]">No courses configured yet.</p>
            ) : (
              courses.map((course) => (
                <label key={course.id} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={recommendation.recommended_course_ids.includes(course.id)}
                    onChange={() => toggleCourse(course.id)}
                    className="size-4"
                  />
                  <span>
                    {course.name} ({course.code})
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

interface TimingMarksPanelProps {
  timing: FacultyCaseTiming
  marks: FacultyCaseMarks
  onTimingChange: <K extends keyof FacultyCaseTiming>(field: K, value: number | null) => void
  onMarksChange: <K extends keyof FacultyCaseMarks>(field: K, value: number | null) => void
}

function TimingMarksPanel({
  timing,
  marks,
  onTimingChange,
  onMarksChange,
}: TimingMarksPanelProps) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Time &amp; Marks Breakdown</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Reading, writing, and rapid fire time in minutes; marks out of 10 (7 written + 3 rapid fire).
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <NumberField
          label="Reading Time (min)"
          value={timing.reading_time_minutes}
          onChange={(value) => onTimingChange("reading_time_minutes", value)}
        />
        <NumberField
          label="Answer Writing Time (min)"
          value={timing.answer_writing_time_minutes}
          onChange={(value) => onTimingChange("answer_writing_time_minutes", value)}
        />
        <NumberField
          label="Rapid Fire Time (min)"
          value={timing.rapid_fire_time_minutes}
          onChange={(value) => onTimingChange("rapid_fire_time_minutes", value)}
        />
        <NumberField
          label="Total Marks"
          value={marks.total_marks}
          onChange={(value) => onMarksChange("total_marks", value)}
        />
        <NumberField
          label="Written Marks"
          value={marks.written_marks}
          onChange={(value) => onMarksChange("written_marks", value)}
        />
        <NumberField
          label="Rapid Fire Marks"
          value={marks.rapid_fire_marks}
          onChange={(value) => onMarksChange("rapid_fire_marks", value)}
        />
      </div>
    </section>
  )
}

interface InstructionsPanelProps {
  instructions: FacultyCaseInstructions
  onChange: <K extends keyof FacultyCaseInstructions>(field: K, value: string) => void
}

function InstructionsPanel({ instructions, onChange }: InstructionsPanelProps) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Student Instructions &amp; Faculty Notes</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Shown to students at each phase, plus discussion notes for faculty only.
      </p>
      <div className="mt-5 grid gap-4">
        <TextAreaField
          label="Student Instructions - Before Reading"
          value={instructions.student_instructions_before ?? ""}
          onChange={(value) => onChange("student_instructions_before", value)}
        />
        <TextAreaField
          label="Student Instructions - While Answering"
          value={instructions.student_instructions_during ?? ""}
          onChange={(value) => onChange("student_instructions_during", value)}
        />
        <TextAreaField
          label="Student Instructions - Submission"
          value={instructions.student_instructions_submission ?? ""}
          onChange={(value) => onChange("student_instructions_submission", value)}
        />
        <TextAreaField
          label="Company Background"
          value={instructions.company_background ?? ""}
          onChange={(value) => onChange("company_background", value)}
        />
        <TextAreaField
          label="Industry Background"
          value={instructions.industry_background ?? ""}
          onChange={(value) => onChange("industry_background", value)}
        />
        <TextAreaField
          label="Faculty Notes - Common Mistakes"
          value={instructions.faculty_common_mistakes ?? ""}
          onChange={(value) => onChange("faculty_common_mistakes", value)}
        />
        <TextAreaField
          label="Faculty Notes - Discussion Points"
          value={instructions.faculty_discussion_points ?? ""}
          onChange={(value) => onChange("faculty_discussion_points", value)}
        />
        <TextAreaField
          label="Key Learning Points"
          value={instructions.key_learning_points ?? ""}
          onChange={(value) => onChange("key_learning_points", value)}
        />
      </div>
    </section>
  )
}

interface QuestionsPanelProps {
  questions: FacultyCaseQuestion[]
  onChange: <K extends keyof FacultyCaseQuestion>(
    index: number,
    field: K,
    value: FacultyCaseQuestion[K],
  ) => void
}

function QuestionsPanel({ questions, onChange }: QuestionsPanelProps) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Structured Written Questions</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Three questions with marks, word limits, model answers, and a marking scheme.
      </p>
      <div className="mt-5 grid gap-5">
        {questions.map((question, index) => (
          <article
            key={question.question_number}
            className="rounded-lg border border-[#e6e8eb] bg-[#f9fafb] p-4"
          >
            <h3 className="text-lg font-semibold text-[#111827]">
              Question {question.question_number}
            </h3>
            <div className="mt-3 grid gap-4">
              <TextAreaField
                label="Question Text"
                value={question.question_text}
                onChange={(value) => onChange(index, "question_text", value)}
              />
              <div className="grid gap-4 sm:grid-cols-4">
                <NumberField
                  label="Marks"
                  value={question.marks}
                  onChange={(value) => onChange(index, "marks", value ?? 0)}
                />
                <SelectField
                  label="Bloom's Level"
                  value={question.blooms_level ?? ""}
                  options={bloomsLevels}
                  onChange={(value) => onChange(index, "blooms_level", value)}
                />
                <NumberField
                  label="Word Limit (Min)"
                  value={question.word_limit_min}
                  onChange={(value) => onChange(index, "word_limit_min", value)}
                />
                <NumberField
                  label="Word Limit (Max)"
                  value={question.word_limit_max}
                  onChange={(value) => onChange(index, "word_limit_max", value)}
                />
              </div>
              <TextAreaField
                label="Per-Question Instructions"
                value={question.instructions ?? ""}
                onChange={(value) => onChange(index, "instructions", value)}
              />
              <TextAreaField
                label="Model Answer"
                value={question.model_answer ?? ""}
                onChange={(value) => onChange(index, "model_answer", value)}
              />
              <TextAreaField
                label="Alternative Answers (one per line)"
                value={(question.alternative_answers ?? []).join("\n")}
                onChange={(value) => onChange(index, "alternative_answers", linesToList(value))}
              />
              <TextAreaField
                label="Marking Scheme"
                value={question.marking_scheme ?? ""}
                onChange={(value) => onChange(index, "marking_scheme", value)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

interface RapidFirePanelProps {
  questions: FacultyRapidFireQuestion[]
  onChange: <K extends keyof FacultyRapidFireQuestion>(
    index: number,
    field: K,
    value: FacultyRapidFireQuestion[K],
  ) => void
}

function RapidFirePanel({ questions, onChange }: RapidFirePanelProps) {
  return (
    <section className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Rapid Fire Questions</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Six quick question/answer pairs shown after the written submission.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {questions.map((question, index) => (
          <article
            key={question.sequence}
            className="rounded-lg border border-[#e6e8eb] bg-[#f9fafb] p-4"
          >
            <h3 className="text-sm font-semibold text-[#111827]">Q{question.sequence}</h3>
            <div className="mt-3 grid gap-3">
              <TextAreaField
                label="Question"
                value={question.question_text}
                rows={2}
                onChange={(value) => onChange(index, "question_text", value)}
              />
              <TextAreaField
                label="Answer"
                value={question.answer_text ?? ""}
                rows={2}
                onChange={(value) => onChange(index, "answer_text", value)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
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

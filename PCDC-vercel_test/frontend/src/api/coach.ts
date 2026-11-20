import api from "./axios"

export interface CoachTurn {
  role: "ai" | "student"
  text: string
}

export async function sendCoachMessage(
  coachId: string,
  message: string,
  history: CoachTurn[],
  sessionId: number | null,
) {
  const response = await api.post<{ coach_id: string; reply: string; session_id: number | null }>(
    "/coach/chat",
    {
      coach_id: coachId,
      message,
      history,
      session_id: sessionId,
    },
  )
  return response.data
}

export interface CoachSessionSummary {
  id: number
  coach_id: string
  created_at: string
  updated_at: string
  message_count: number
}

export interface CoachSessionDetail {
  id: number
  coach_id: string
  messages: CoachTurn[]
  created_at: string
  updated_at: string
}

/** The logged-in user's saved coaching sessions, most recent first. */
export async function getCoachSessions() {
  const response = await api.get<CoachSessionSummary[]>("/coach/sessions")
  return response.data
}

export async function getCoachSession(sessionId: number) {
  const response = await api.get<CoachSessionDetail>(`/coach/sessions/${sessionId}`)
  return response.data
}

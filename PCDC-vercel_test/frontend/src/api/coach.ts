import api from "./axios"

export interface CoachTurn {
  role: "ai" | "student"
  text: string
}

export async function sendCoachMessage(coachId: string, message: string, history: CoachTurn[]) {
  const response = await api.post<{ coach_id: string; reply: string }>("/coach/chat", {
    coach_id: coachId,
    message,
    history,
  })
  return response.data
}

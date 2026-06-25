export type UserRole =
  | "student"
  | "faculty"
  | "mentor"
  | "program_head"
  | "director"
  | "admin"

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}

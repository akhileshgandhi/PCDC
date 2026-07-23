import { CircleAlert } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getStudentProfile, type StudentProfile } from "../../api/student"
import DashboardLayout from "../../layouts/DashboardLayout"

function initials(name: string | null): string {
  if (!name) return ""
  const parts = name.split(" ").filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface FieldRowProps {
  label: string
  value: string | number | null
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium text-[#6b7280]">{label}</span>
      <span className="text-sm font-semibold text-[#111827]">{value ?? "—"}</span>
    </div>
  )
}

export default function Profile() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getStudentProfile()
      .then((data) => {
        if (isMounted) setProfile(data)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">My Profile</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Your personal and academic information
          </p>
        </div>

        <div className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-[#081d3a] text-lg font-semibold text-white">
              {isLoading ? "--" : initials(profile?.full_name ?? null)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">
                {isLoading ? "Loading..." : profile?.full_name ?? "—"}
              </h2>
              <p className="text-sm text-[#6b7280]">
                Student
                {profile?.batch_name ? ` · ${profile.batch_name}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#92702a]">
            Personal Information
          </h3>
          <div className="mt-2 divide-y divide-[#e6e8eb]">
            <FieldRow label="Full Name" value={profile?.full_name ?? null} />
            <FieldRow label="Email" value={profile?.email ?? null} />
          </div>
        </div>

        <div className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#92702a]">
            Academic Information
          </h3>
          <div className="mt-2 divide-y divide-[#e6e8eb]">
            <FieldRow label="Course" value={profile?.course_name ?? null} />
            <FieldRow label="Batch" value={profile?.batch_name ?? null} />
            <FieldRow label="Semester" value={profile?.semester_name ?? null} />
            <FieldRow label="Section" value={profile?.section_name ?? null} />
            <FieldRow label="Program" value={profile?.course_name ?? null} />
          </div>
        </div>

        <div className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#92702a]">
            Mentor
          </h3>
          {profile?.mentor ? (
            <div className="mt-3 flex items-center gap-3">
              <div className="grid size-14 place-items-center rounded-lg bg-[#f4e4c1] text-lg font-semibold text-[#081d3a]">
                {profile.mentor.initials}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-[#111827]">{profile.mentor.name}</h4>
                <p className="text-xs font-semibold uppercase text-[#92702a]">
                  Assigned Executive Mentor
                </p>
              </div>
              <Link
                to="/student/mentor-support"
                className="inline-flex items-center justify-center rounded-md border border-[#081d3a] px-4 py-2 text-sm font-semibold text-[#081d3a] transition hover:bg-[#081d3a] hover:text-white"
              >
                Schedule Session
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm font-medium text-[#6b7280]">
              {isLoading ? "Loading..." : "No mentor assigned yet."}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[#e6e8eb] bg-white p-5 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#92702a]">
            Career
          </h3>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-[#6b7280]">Current Pathway</p>
              <h4 className="font-semibold text-[#111827]">
                {profile?.career_track_name ?? "Not set"}
              </h4>
            </div>
            <Link
              to="/student/career-pathway"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#92702a]"
            >
              Change Pathway →
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-[#e6e8eb] bg-[#f6f7fb] p-4 text-sm text-[#6b7280]">
          <CircleAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          <p>
            Academic details (course, semester, section) are managed by the institution.
            Contact your program administrator to make changes.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}

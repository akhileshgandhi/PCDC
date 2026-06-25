"use client";
import Shell from "@/components/Shell";
import ProfileSettings from "@/components/ProfileSettings";

export default function StudentProfile() {
  return (
    <Shell title="My Profile" subtitle="Your account details and security.">
      <ProfileSettings />
    </Shell>
  );
}

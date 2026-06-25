"use client";
import Shell from "@/components/Shell";
import CaseStudyForm from "@/components/CaseStudyForm";

export default function NewCaseStudy() {
  return (
    <Shell title="New case study" subtitle="Author a new case study for your students.">
      <CaseStudyForm />
    </Shell>
  );
}

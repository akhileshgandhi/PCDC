"use client";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import CaseStudyAnalytics from "@/components/CaseStudyAnalytics";

export default function MentorCaseStudyDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <Shell title="Case study analytics" subtitle="How your students performed.">
      <CaseStudyAnalytics id={id} backHref="/mentor/case-studies" />
    </Shell>
  );
}

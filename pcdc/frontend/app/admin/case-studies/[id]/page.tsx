"use client";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import CaseStudyAnalytics from "@/components/CaseStudyAnalytics";

export default function AdminCaseStudyDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <Shell title="Case study analytics" subtitle="Oversight view across all departments.">
      <CaseStudyAnalytics id={id} backHref="/admin/case-studies" />
    </Shell>
  );
}

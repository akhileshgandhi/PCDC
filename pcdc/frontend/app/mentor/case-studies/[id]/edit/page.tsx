"use client";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import CaseStudyForm from "@/components/CaseStudyForm";

export default function EditCaseStudy() {
  const { id } = useParams<{ id: string }>();
  return (
    <Shell title="Edit case study" subtitle="Update the scenario, capabilities and rules.">
      <CaseStudyForm id={Number(id)} />
    </Shell>
  );
}

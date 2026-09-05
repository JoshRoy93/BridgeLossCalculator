import { currentRun, type FlowResult, type Project } from "./model";
export function verdict(
  result: FlowResult,
  p: Project,
):
  | "Meets criteria"
  | "Exceeds criteria"
  | "Outside model range"
  | "Set criteria" {
  if (
    result.status !== "ok" ||
    result.afflux === null ||
    result.freeboard === null
  )
    return "Outside model range";
  if (
    !p.criteria.source.trim() ||
    !Number.isFinite(p.criteria.afflux) ||
    !Number.isFinite(p.criteria.freeboard) ||
    p.criteria.afflux < 0 ||
    p.criteria.freeboard < 0
  )
    return "Set criteria";
  return result.afflux <= p.criteria.afflux &&
    result.freeboard >= p.criteria.freeboard
    ? "Meets criteria"
    : "Exceeds criteria";
}
export function reviewIssues(p: Project): string[] {
  const issues: string[] = [];
  if (!currentRun(p)) issues.push("Run the current inputs.");
  if (
    !p.name.trim() ||
    !p.reference.trim() ||
    !p.location.trim() ||
    !p.datum.trim() ||
    !p.author.trim()
  )
    issues.push(
      "Complete project name, reference, location, datum and preparer.",
    );
  if (p.inputs.sections.some((s) => !s.source.trim()))
    issues.push("Record a source for every survey section.");
  if (p.inputs.flows.some((f) => !f.source.trim()))
    issues.push("Record a source for every flow and boundary.");
  if (
    !p.criteria.source.trim() ||
    [p.criteria.afflux, p.criteria.freeboard, p.criteria.comparison].some(
      (n) => !Number.isFinite(n) || n < 0,
    )
  )
    issues.push("Set non-negative criteria and record their source.");
  if (Object.values(p.evidence).some((s) => !s.trim()))
    issues.push("Complete all review evidence, reviewer name and conclusion.");
  if (currentRun(p)?.results.some((r) => r.status !== "ok"))
    issues.push(
      "Resolve events outside the model range before recording review completion.",
    );
  return issues;
}

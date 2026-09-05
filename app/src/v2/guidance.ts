import { currentReview, currentRun, type Project } from "./model";

export const assessmentSteps = [
  {
    page: "project",
    title: "Project details",
    advice:
      "Name the crossing and record its location, datum and preparer. You can fill in missing details later, before recording the review.",
  },
  {
    page: "geometry",
    title: "Survey sections",
    advice:
      "Work through all four section tabs. Paste or enter coordinates, then choose Apply coordinates in each section. Record where each survey came from.",
  },
  {
    page: "bridge",
    title: "Bridge & losses",
    advice:
      "Replace the example opening, deck and pier dimensions with your crossing. Check the drawing as you work, then confirm the reach lengths and loss coefficients.",
  },
  {
    page: "flows",
    title: "Flow events",
    advice:
      "Add at least one event with a discharge and downstream water level. Record the source for review. The hydrology helper is optional.",
  },
  {
    page: "results",
    title: "Results & checks",
    advice:
      "Inspect each event, including any model-limit messages. Set project criteria in Engineering review to interpret the results. External comparison is optional.",
  },
  {
    page: "review",
    title: "Engineering review",
    advice:
      "Record your criteria, evidence and conclusion. The checklist explains what remains before you can record completion. You can export a draft report before completing this step.",
  },
  {
    page: "report",
    title: "Report & export",
    advice:
      "Download the report and project JSON together. The JSON lets you reopen the assessment. AI writing is optional and is not needed to export.",
  },
] as const;

// Route existing solver messages without changing numerical validation.
export function inputIssuePage(message: string): string {
  if (/^(Event |Enter between)/.test(message)) return "flows";
  if (/abutment|soffit/i.test(message)) return "bridge";
  if (/^(Section |Exactly four)/.test(message)) return "geometry";
  return "bridge";
}

export function reviewIssuePage(message: string): string {
  if (message.startsWith("Run ") || message.includes("outside the model"))
    return "results";
  if (message.includes("project name")) return "project";
  if (message.includes("survey section")) return "geometry";
  if (message.includes("flow and boundary")) return "flows";
  return "review";
}

export function resultAdvice(p: Project): {
  title: string;
  text: string;
  page: string;
} {
  const run = currentRun(p);
  if (!run)
    return {
      title: p.run ? "Update your results" : "Calculate your first results",
      text: "Run the current inputs to see water levels, afflux and freeboard. Any input checks will link you to the section that needs attention.",
      page: "results",
    };
  const outside = run.results.filter((r) => r.status !== "ok");
  if (outside.length)
    return {
      title: `${outside.length} event${outside.length === 1 ? " needs" : "s need"} investigation`,
      text: "Open the flagged events and read the reason each could not be calculated. Check the input data and model suitability before drawing a conclusion. A draft report is still available.",
      page: "results",
    };
  if (!p.criteria.source.trim())
    return {
      title: "Set the criteria for this crossing",
      text: "Your results are calculated. Record the applicable criteria and their source next. The example limits do not establish whether your crossing is acceptable.",
      page: "review",
    };
  const exceeds = run.results.some(
    (r) => r.afflux! > p.criteria.afflux || r.freeboard! < p.criteria.freeboard,
  );
  if (exceeds && !currentReview(p))
    return {
      title: "Investigate the criteria exceedances",
      text: "Compare the flagged results with the project criteria. Record your findings and outstanding actions in the review. Use Alternatives if you want to compare a changed design.",
      page: "review",
    };
  if (currentReview(p))
    return {
      title: "Prepare your handover",
      text: "Your review is recorded for the current assessment. Export the report with a project backup so it can be checked and reopened.",
      page: "report",
    };
  return {
    title: "Record the engineering review",
    text: "The calculated events are within the model range. Complete the source and evidence checklist before recording your conclusion.",
    page: "review",
  };
}

"use client";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { assessmentSteps, inputIssuePage, resultAdvice } from "../guidance";
import { currentRun, type Project } from "../model";

type Props = {
  project: Project;
  page: string;
  navigate: (page: string) => void;
  run: () => void;
  busy: boolean;
  issues: string[];
};

export function WorkflowGuide({
  project,
  page,
  navigate,
  run,
  busy,
  issues,
}: Props) {
  const index = assessmentSteps.findIndex((s) => s.page === page);
  const step = assessmentSteps[index];
  const calculated = currentRun(project);
  const advice = resultAdvice(project);
  const overview = page === "overview";
  if (!step && !overview) {
    if (page === "library" || page === "examples") return null;
    return (
      <section className="workflow-guide" aria-label="Step guidance">
        <div className="guide-copy">
          <span className="eyebrow">Optional tool</span>
          <p>
            {page === "hydrology"
              ? "Use this helper if you need to estimate discharge. Check and add the selected estimate to Flow events, then enter its downstream water level."
              : page === "simulation"
                ? "Explore geometry and what-if inputs here. Apply to project to keep a change, or reset to return to the saved assessment."
                : "Save the current calculated case as a baseline, then change inputs and calculate again to compare alternatives."}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => navigate(page === "hydrology" ? "flows" : "results")}
        >
          <ArrowLeft size={16} />
          {page === "hydrology" ? "Back to flow events" : "Back to results"}
        </button>
      </section>
    );
  }
  const needsRun = page === "results" && !calculated;
  return (
    <section className="workflow-guide" aria-label="Step guidance">
      <div className="guide-copy">
        <span className="eyebrow">
          {overview
            ? "Your next step"
            : `Step ${index + 1} of ${assessmentSteps.length}`}
        </span>
        <h3>
          {overview
            ? calculated || project.run
              ? advice.title
              : "Start with the crossing, then work through the inputs"
            : step.title}
        </h3>
        <p>
          {overview
            ? calculated || project.run
              ? advice.text
              : "Follow the numbered steps in the sidebar. You can move between them at any time. New assessments include example geometry to replace with your own data."
            : needsRun
              ? advice.text
              : step.advice}
        </p>
      </div>
      {overview && (
        <div className="guide-actions">
          <button
            className="button primary"
            onClick={() =>
              navigate(calculated || project.run ? advice.page : "project")
            }
          >
            {calculated || project.run
              ? `Open ${assessmentSteps.find((s) => s.page === advice.page)?.title}`
              : "Walk through setup"}
            <ArrowRight size={16} />
          </button>
          {!calculated && !issues.length && (
            <button className="button secondary" disabled={busy} onClick={run}>
              <Play size={15} />
              {busy ? "Calculating…" : "Try current inputs"}
            </button>
          )}
          <button className="button quiet" onClick={() => navigate("library")}>
            New or existing assessment
          </button>
        </div>
      )}
      {needsRun && (
        <button className="button primary" disabled={busy} onClick={run}>
          <Play size={15} />
          {busy ? "Calculating…" : "Calculate results"}
        </button>
      )}
      {((overview && !calculated) || page === "flows" || needsRun) && (
        <div className="guide-readiness">
          {issues.length ? (
            <>
              <strong>
                {issues.length} input check{issues.length === 1 ? "" : "s"}{" "}
                before calculation
              </strong>
              <p>
                You can keep editing or move to another step. Calculation needs
                the following changes.
              </p>
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>
                    <button
                      className="issue-link"
                      onClick={() => navigate(inputIssuePage(issue))}
                    >
                      {issue}
                      <ArrowRight size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              Inputs pass the calculation checks. Source records and review
              evidence can be completed later.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function StepActions({
  project,
  page,
  navigate,
  run,
  busy,
}: Omit<Props, "issues">) {
  const index = assessmentSteps.findIndex((s) => s.page === page);
  if (index < 0) return null;
  const next = assessmentSteps[index + 1];
  return (
    <div className="step-actions" aria-label="Step navigation">
      <button
        className="button quiet"
        onClick={() =>
          navigate(index ? assessmentSteps[index - 1].page : "overview")
        }
      >
        <ArrowLeft size={16} />
        {index ? assessmentSteps[index - 1].title : "Overview"}
      </button>
      <div>
        {page === "flows" ? (
          <>
            <button
              className="button quiet"
              onClick={() => navigate("results")}
            >
              Go to results
            </button>
            <button className="button primary" disabled={busy} onClick={run}>
              <Play size={15} />
              {busy ? "Calculating…" : "Calculate & view results"}
            </button>
          </>
        ) : next ? (
          <button
            className="button primary"
            onClick={() => navigate(next.page)}
          >
            {page === "review" ? "Continue to report" : `Next: ${next.title}`}
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="button secondary"
            onClick={() => navigate("overview")}
          >
            Back to overview
          </button>
        )}
        {page === "review" && !project.review && (
          <small>A draft report is available after calculation.</small>
        )}
      </div>
    </div>
  );
}

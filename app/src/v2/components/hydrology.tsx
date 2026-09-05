"use client";
import { useState } from "react";
import { uid, type Project } from "../model";
import { rationalDischarge } from "../hydrology";
import { Field, NumberField } from "./fields";
import { fmt } from "../report";

export function Hydrology({
  project: p,
  update,
  notify,
}: {
  project: Project;
  update: (p: Project) => void;
  notify: (message: string) => void;
}) {
  const [area, setArea] = useState(1),
    [intensity, setIntensity] = useState(50),
    [coefficient, setCoefficient] = useState(0.5);
  const [duration, setDuration] = useState(60),
    [name, setName] = useState("1% AEP"),
    [source, setSource] = useState("");
  const [tailwater, setTailwater] = useState(p.inputs.flows[0]?.tailwater ?? 0);
  let q: number | null = null;
  try {
    q = rationalDischarge(area, intensity, coefficient);
  } catch {
    /* Display input guidance below. */
  }
  return (
    <>
      <div className="section-heading">
        <h2>Hydrology inputs</h2>
        <p>
          Estimate peak discharge with entered rainfall and catchment
          assumptions, then add a flow event.
        </p>
      </div>
      <div className="notice">
        This is a Rational Method calculation aid. Confirm that the method,
        duration and runoff coefficient suit the catchment. Values below are
        starting examples, not site data. Enter a source before using them.
      </div>
      <div className="form-grid three">
        <NumberField
          label="Catchment area · km²"
          value={area}
          min={0.001}
          onChange={setArea}
        />
        <NumberField
          label="Rainfall intensity · mm/h"
          value={intensity}
          min={0.001}
          onChange={setIntensity}
        />
        <NumberField
          label="Runoff coefficient C"
          value={coefficient}
          min={0.001}
          max={1}
          onChange={setCoefficient}
        />
        <NumberField
          label="Design duration · minutes"
          value={duration}
          min={0.001}
          onChange={setDuration}
          hint="Use intensity for the selected duration and event probability."
        />
        <Field label="Flow event name" value={name} onChange={setName} />
        <NumberField
          label="Downstream tailwater · m"
          value={tailwater}
          onChange={setTailwater}
          hint="A separate hydraulic boundary is required."
        />
      </div>
      <Field
        label="Rainfall, catchment, method and boundary sources"
        value={source}
        onChange={(v) => setSource(v.slice(0, 19500))}
        multiline
        placeholder="Record data references, duration justification, runoff coefficient basis and tailwater source."
      />
      <div className="notice">
        <strong>Estimated discharge: {fmt(q)} m³/s</strong>
        <p>
          Q = C × I × A / 3.6 for area in km² and intensity in mm/h. Duration
          selects the entered intensity; this helper does not fetch or invent
          rainfall data.
        </p>
      </div>
      <button
        className="button primary"
        disabled={
          q === null ||
          duration <= 0 ||
          !source.trim() ||
          !name.trim() ||
          p.inputs.flows.length >= 30 ||
          !Number.isFinite(tailwater)
        }
        onClick={() => {
          if (
            p.inputs.flows.some(
              (f) => f.name.trim().toLowerCase() === name.trim().toLowerCase(),
            )
          ) {
            notify(
              "Use a unique event name so the new estimate does not replace an existing design event.",
            );
            return;
          }
          update({
            ...p,
            inputs: {
              ...p.inputs,
              flows: [
                ...p.inputs.flows,
                {
                  id: uid(),
                  name: name.trim(),
                  discharge: q!,
                  tailwater,
                  reference: null,
                  source: `Rational Method: C=${coefficient}; I=${intensity} mm/h; A=${area} km²; duration=${duration} min; Q=CIA/3.6. ${source}`,
                },
              ],
            },
            review: null,
          });
          notify(
            "Hydrology estimate added as a flow event with its assumptions and sources. Run the assessment to calculate water levels.",
          );
        }}
      >
        Add estimated flow event
      </button>
    </>
  );
}

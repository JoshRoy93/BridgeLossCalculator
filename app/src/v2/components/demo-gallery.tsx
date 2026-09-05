"use client";
import { useId, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ExternalLink, MapPin, Pause, Play } from "lucide-react";
import { DEMO_BRIDGES, demoBasis, type DemoBridge } from "../demo-bridges";
import { inputKey, type DemoBasis, type Inputs } from "../model";
import "./demo-gallery.css";

export function DemoSourceBasis({
  basis,
  inputs,
  expanded = false,
}: {
  basis: DemoBasis;
  inputs: Inputs;
  expanded?: boolean;
}) {
  const changed = basis.inputKey !== inputKey(inputs);
  return (
    <details className="demo-basis" open={expanded || undefined}>
      <summary>
        <span>Example source record · {basis.title}</span>
        <small>
          {changed ? "Inputs edited since loading" : "Original example inputs"}
        </small>
      </summary>
      <div className="demo-basis-body">
        <p>
          {basis.era}. {basis.summary}
        </p>
        {changed && (
          <p className="note">
            This record describes the original example. Your current input
            values have changed; the table below is retained as source history.
          </p>
        )}
        <div className="demo-evidence-key">
          <span className="demo-kind published">Published</span> In the source{" "}
          <span className="demo-kind derived">Derived</span> Calculated from it{" "}
          <span className="demo-kind estimated">Estimated</span> Read
          approximately <span className="demo-kind assumed">Assumed</span> Added
          for this model
        </div>
        <div className="table-scroll">
          <table className="demo-source-table">
            <thead>
              <tr>
                <th>Input</th>
                <th>Example value</th>
                <th>Basis</th>
                <th>How it is used</th>
              </tr>
            </thead>
            <tbody>
              {basis.values.map((v) => (
                <tr key={v.field}>
                  <th scope="row">{v.field}</th>
                  <td>{v.value}</td>
                  <td>
                    <span className={`demo-kind ${v.kind}`}>{v.kind}</span>
                  </td>
                  <td>
                    {v.note}{" "}
                    {v.sourceIds.map((id) => {
                      const source = basis.sources.find((s) => s.id === id);
                      return source ? (
                        <a
                          key={id}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          [{id}]
                        </a>
                      ) : null;
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Read the source</h3>
        <ul className="demo-source-links">
          {basis.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                [{s.id}] {s.title} <ExternalLink size={13} />
              </a>
              <small>
                {s.date} · {s.pages}
              </small>
            </li>
          ))}
        </ul>
        <h3>Model simplifications</h3>
        <ul>
          {basis.limitations.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function DemoPreview({ demo }: { demo: DemoBridge }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      className="demo-preview"
      aria-label={`${playing ? "Pause" : "Play"} ${demo.name} preview`}
      aria-pressed={playing}
      disabled={failed}
      onClick={() => {
        if (playing) video.current?.pause();
        else void video.current?.play().catch(() => setFailed(true));
      }}
    >
      <video
        ref={video}
        poster={`/demo-bridges/${demo.id}.png`}
        preload="none"
        muted
        loop
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        aria-hidden="true"
      >
        <source src={`/demo-bridges/${demo.id}.webm`} type="video/webm" />
      </video>
      <span className="demo-preview-label">
        Model animation · simplified geometry
      </span>
      <span className="demo-play">
        {playing ? <Pause size={16} /> : <Play size={16} />}
        {failed
          ? "Preview unavailable"
          : playing
            ? "Pause preview"
            : "Play preview"}
      </span>
    </button>
  );
}

function DemoValues({ demo }: { demo: DemoBridge }) {
  const { bridge, sections, flows } = demo.inputs;
  const values = [
    ["Opening width", `${bridge.right - bridge.left} m`],
    ["Minimum soffit", `${bridge.soffit.toFixed(2)} m AHD`],
    ["Deck / road limit", `${bridge.deck.toFixed(2)} m AHD`],
    [
      "Lowest bed point",
      `${Math.min(...sections[0].points.map((p) => p.elevation)).toFixed(2)} m AHD`,
    ],
    ["Piers", `${bridge.piers.length} × ${bridge.piers[0]?.width ?? 0} m`],
    ["Length along flow", `${bridge.deckLength} m`],
  ];
  return (
    <div className="demo-values">
      <div className="demo-values-heading">
        <h3>Loaded values</h3>
        <span>SI units · m AHD</span>
      </div>
      <dl className="demo-dimensions">
        {values.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="demo-flow-heading">
        <h4>Flow cases</h4>
        <span>{flows.length} events</span>
      </div>
      <table className="demo-flow-table" aria-label={`${demo.name} flow cases`}>
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">
              Flow <small>m³/s</small>
            </th>
            <th scope="col">
              Tailwater <small>m AHD</small>
            </th>
          </tr>
        </thead>
        <tbody>
          {flows.map((f) => (
            <tr key={f.id}>
              <th scope="row">
                {f.name.replace(/ · (2024 study|estimated)$/, "")}
              </th>
              <td>{f.discharge}</td>
              <td>{f.tailwater.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="demo-flow-note">
        {demo.id === "windsor-design"
          ? "Approximate hydrograph readings, with an assumed boundary location."
          : "Council study event summaries, adopted as steady flow cases."}
      </p>
    </div>
  );
}

export function DemoGallery({ load }: { load: (id: string) => void }) {
  const [selection, setSelection] = useState({ index: 0, direction: 1 });
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const demo = DEMO_BRIDGES[selection.index];
  function select(index: number) {
    setSelection((previous) => ({
      index,
      direction: index >= previous.index ? 1 : -1,
    }));
  }
  return (
    <section className="demo-browser" aria-label="Example bridge browser">
      <header className="demo-heading">
        <h2>Example bridges</h2>
        <p>
          Choose a crossing, inspect its inputs, then open an editable
          assessment.
        </p>
      </header>
      <div className="demo-tabs" role="tablist" aria-label="Choose a bridge">
        {DEMO_BRIDGES.map((d, index) => (
          <button
            key={d.id}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${d.id}`}
            aria-selected={selection.index === index}
            aria-controls={`${id}-panel-${d.id}`}
            tabIndex={selection.index === index ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => {
              const target =
                event.key === "ArrowRight"
                  ? (index + 1) % DEMO_BRIDGES.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + DEMO_BRIDGES.length) % DEMO_BRIDGES.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? DEMO_BRIDGES.length - 1
                        : null;
              if (target === null) return;
              event.preventDefault();
              select(target);
              tabs.current[target]?.focus();
            }}
          >
            {d.name}
          </button>
        ))}
        <span
          className="demo-tab-indicator"
          aria-hidden="true"
          style={{
            width: `${100 / DEMO_BRIDGES.length}%`,
            transform: `translateX(${selection.index * 100}%)`,
          }}
        />
      </div>
      <div
        key={`view-${demo.id}`}
        className="demo-detail"
        role="tabpanel"
        id={`${id}-panel-${demo.id}`}
        aria-labelledby={`${id}-tab-${demo.id}`}
        tabIndex={0}
        style={
          { "--demo-shift": `${selection.direction * 14}px` } as CSSProperties
        }
      >
        <div className="demo-overview">
          <div className="demo-identity">
            <span>
              <MapPin size={13} />
              {demo.location}
            </span>
            <h3>{demo.name}</h3>
          </div>
          <DemoPreview demo={demo} />
        </div>
        <div className="demo-input-panel">
          <DemoValues demo={demo} />
          <div className="demo-open">
            <button className="button primary" onClick={() => load(demo.id)}>
              Use {demo.name}
              <ArrowRight size={16} />
            </button>
            <small>
              Opens a separate project with all four sections and source notes.
            </small>
          </div>
        </div>
        <div className="demo-context">
          <p>{demo.summary}</p>
          <a href={demo.sources[0].url} target="_blank" rel="noreferrer">
            {demo.era}
            <ExternalLink size={13} />
          </a>
          <p className="demo-assumption-note">
            {demo.id === "windsor-design"
              ? "Design reconstruction. Sloped deck and soffit are simplified; sections are repeated."
              : "Channel shape and reach lengths are assumed. The road limit represents the southern approach."}{" "}
            Roughness is assumed.
          </p>
          <p className="demo-secondary-values">
            Manning <strong>n {demo.inputs.sections[0].n.toFixed(3)}</strong> ·
            Reaches{" "}
            <strong>
              {demo.inputs.bridge.expansionLength} /{" "}
              {demo.inputs.bridge.contractionLength} m
            </strong>
            <br />
            Loss coefficients{" "}
            <strong>
              Kc {demo.inputs.bridge.contraction} / Ke{" "}
              {demo.inputs.bridge.expansion}
            </strong>{" "}
            · Blockage <strong>{demo.inputs.bridge.blockage}%</strong>
          </p>
        </div>
      </div>
      <DemoSourceBasis
        key={`source-${demo.id}`}
        basis={demoBasis(demo)}
        inputs={demo.inputs}
      />
    </section>
  );
}

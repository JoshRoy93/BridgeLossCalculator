"use client";
import { useEffect, useRef, useState } from "react";
import {
  assessmentKey,
  currentAssessment,
  currentRun,
  type Project,
} from "../model";
import { reportHtml } from "../report";
import { Field } from "./fields";

type AccountState = {
  available: boolean;
  account: { type: string; email: string | null; plan: string | null } | null;
  pending: boolean;
  loginError: string | null;
  authPath: string;
};
async function localRequest(path: string, body?: object, signal?: AbortSignal) {
  const response = await fetch(`/api/local/${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-BLC-Local": "1" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal,
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "OpenAI sign-in is available in the local app. Run npm start on your computer and open http://127.0.0.1:3000.",
    );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "OpenAI request failed.");
  return result;
}
export function AiAssessment({
  project: p,
  update,
}: {
  project: Project;
  update: (p: Project) => void;
}) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loginUrl, setLoginUrl] = useState("");
  const [model, setModel] = useState("");
  const [tone, setTone] = useState("technical");
  const controller = useRef<AbortController | null>(null);
  const latest = useRef({ p, update });
  useEffect(() => {
    latest.current = { p, update };
  }, [p, update]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await localRequest("account");
        if (active) setAccount(result);
      } catch (error) {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not check OpenAI sign-in.",
          );
      }
    };
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 4000);
    return () => {
      active = false;
      clearInterval(timer);
      controller.current?.abort();
    };
  }, []);
  async function login() {
    setConnecting(true);
    setMessage("");
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    try {
      const result = await localRequest("login", {});
      setLoginUrl(result.authUrl);
      if (popup) popup.location.href = result.authUrl;
      setMessage(
        "Finish signing in on OpenAI's page. This app will update automatically.",
      );
    } catch (error) {
      popup?.close();
      setMessage(
        error instanceof Error ? error.message : "Could not start sign-in.",
      );
    } finally {
      setConnecting(false);
    }
  }
  async function generate() {
    if (
      p.aiAssessment?.text &&
      !window.confirm(
        "Replace the current AI draft and any edits with a new assessment?",
      )
    )
      return;
    const key = assessmentKey(p);
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setMessage("");
    try {
      const result = await localRequest(
        "assessment",
        {
          report: reportHtml({
            ...p,
            aiAssessment: undefined,
            sceneImage: undefined,
          }),
          model: model.trim(),
          tone,
        },
        abort.signal,
      );
      const current = latest.current;
      if (
        current.p.id !== p.id ||
        assessmentKey(current.p) !== key ||
        current.p.aiAssessment?.text !== p.aiAssessment?.text
      ) {
        setMessage(
          "The assessment changed during generation. Generate again using the current inputs.",
        );
        return;
      }
      if (
        typeof result.text !== "string" ||
        !result.text.trim() ||
        result.text.length > 20000
      )
        throw new Error("OpenAI returned an invalid assessment.");
      current.update({
        ...current.p,
        aiAssessment: {
          text: result.text,
          date: result.date,
          model: result.model,
          key,
          edited: false,
        },
        review: null,
      });
      setMessage(
        "AI draft saved and included in the report. Review the text before handover.",
      );
    } catch (error) {
      setMessage(
        abort.signal.aborted
          ? "Assessment cancelled. Your previous draft is unchanged."
          : error instanceof Error
            ? error.message
            : "Assessment failed.",
      );
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  const fresh = currentAssessment(p);
  return (
    <section className="ai-assessment">
      <div className="section-heading">
        <h2>AI report assessment</h2>
        <p>
          Generate an editable review of the current results, criteria and
          evidence.
        </p>
      </div>
      <div className="notice">
        <strong>
          {account?.account
            ? `Signed in${account.account.email ? ` as ${account.account.email}` : " to OpenAI"}`
            : "Connect your OpenAI account"}
        </strong>
        <p>
          {account?.account?.plan ? `${account.account.plan} plan. ` : ""}
          Sign-in opens OpenAI in a separate window. Credentials stay in this
          app&apos;s local auth.json and are reused on this computer.
        </p>
        {account?.authPath && (
          <small className="auth-path">{account.authPath}</small>
        )}
        <div className="inline-actions">
          <button
            className="button secondary"
            disabled={connecting || busy}
            onClick={login}
          >
            {connecting
              ? "Opening sign-in…"
              : account?.account
                ? "Change OpenAI account"
                : "Sign in with OpenAI"}
          </button>
          {(account?.account || account?.pending) && (
            <button
              className="button quiet"
              disabled={busy}
              onClick={async () => {
                try {
                  await localRequest("logout", {});
                  setAccount(await localRequest("account"));
                  setLoginUrl("");
                  setMessage("Signed out of this app.");
                } catch (error) {
                  setMessage(String(error));
                }
              }}
            >
              {account?.pending ? "Cancel sign-in" : "Sign out"}
            </button>
          )}
          {loginUrl && !account?.account && (
            <a href={loginUrl} target="_blank" rel="noreferrer">
              Continue OpenAI sign-in
            </a>
          )}
        </div>
      </div>
      <div className="form-grid">
        <Field
          label="Model"
          value={model}
          onChange={setModel}
          placeholder="Use account default"
          hint="Leave blank for Codex's configured default, or enter a model available to your account."
        />
        <label className="field">
          <span>Writing style</span>
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="technical">Technical assessment</option>
            <option value="summary">Plain-language summary</option>
          </select>
        </label>
      </div>
      <p className="muted">
        Generating sends this project&apos;s report, including survey, location
        and review notes, to OpenAI using your account. AI text is a draft for
        engineering review.
      </p>
      <div className="inline-actions">
        <button
          className="button primary"
          disabled={!account?.account || !currentRun(p) || busy}
          onClick={generate}
        >
          {busy
            ? "Assessing report…"
            : p.aiAssessment
              ? "Regenerate assessment"
              : "Generate assessment"}
        </button>
        {busy && (
          <button
            className="button secondary"
            onClick={() => controller.current?.abort()}
          >
            Cancel generation
          </button>
        )}
      </div>
      {!currentRun(p) && (
        <p className="muted">Run the current inputs to enable AI assessment.</p>
      )}
      {!account?.account && (
        <p className="muted">
          Sign in to OpenAI above to generate an AI draft. Calculations, manual
          review and report exports work without sign-in.
        </p>
      )}
      {(message || account?.loginError) && (
        <p className="notice" role="status">
          {account?.loginError || message}
        </p>
      )}
      {p.aiAssessment && (
        <>
          <p className={fresh ? "muted" : "notice"}>
            {fresh
              ? `${p.aiAssessment.edited ? "Edited" : "Generated"} draft · ${p.aiAssessment.model} · ${new Date(p.aiAssessment.date).toLocaleString("en-AU")}`
              : "This draft is out of date and is excluded from the report. Regenerate it for the current assessment."}
          </p>
          <Field
            label="Assessment draft"
            multiline
            value={p.aiAssessment.text}
            onChange={(text) =>
              update({
                ...p,
                aiAssessment: { ...p.aiAssessment!, text, edited: true },
                review: null,
              })
            }
          />
          <button
            className="button quiet"
            onClick={() => {
              if (window.confirm("Remove the AI draft from this project?"))
                update({ ...p, aiAssessment: undefined, review: null });
            }}
          >
            Remove draft
          </button>
        </>
      )}
    </section>
  );
}

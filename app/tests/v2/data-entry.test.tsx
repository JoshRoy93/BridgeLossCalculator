import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SurveyGrid } from "@/v2/components/survey-grid";
import { NumberField } from "@/v2/components/fields";
import { readClipboard } from "@/v2/clipboard";
import {
  pasteSurveyCells,
  readSurveyCells,
  surveyErrors,
} from "@/v2/survey-grid";
import { pasteFlowCells } from "@/v2/flow-grid";
import { createProject } from "@/v2/model";

afterEach(cleanup);
describe("spreadsheet data entry", () => {
  it("reads CSV quoting, headers, spreadsheet tabs and blank leading cells", () => {
    expect(
      readSurveyCells('station,elevation\r\n"0","104"\r\n8,101\r\n'),
    ).toEqual([
      ["0", "104"],
      ["8", "101"],
    ]);
    expect(readSurveyCells("\t104\n8\t101\n")).toEqual([
      ["", "104"],
      ["8", "101"],
    ]);
    expect(readClipboard('Event,35,102,"Model A, run 2\nChecked"')).toEqual([
      ["Event", "35", "102", "Model A, run 2\nChecked"],
    ]);
    expect(() => readClipboard('0,"104')).toThrow("closing quote");
    expect(() => readSurveyCells("0,104,7")).toThrow("two consistent columns");
  });
  it("pastes one column at an offset, extends rows and refuses overflow", () => {
    const original: [string, string][] = [
      ["0", "106"],
      ["8", "104"],
      ["14", "100"],
    ];
    expect(pasteSurveyCells(original, [["103"], ["101"]], 1, 1)).toEqual([
      ["0", "106"],
      ["8", "103"],
      ["14", "101"],
    ]);
    expect(
      pasteSurveyCells(
        original,
        [
          ["22", "100"],
          ["30", "103"],
        ],
        3,
        0,
      ),
    ).toHaveLength(5);
    expect(() => pasteSurveyCells(original, [["22", "100"]], 0, 1)).toThrow(
      "station cell",
    );
    expect(original[1][1]).toBe("104");
    expect(
      surveyErrors([
        ["0", "104"],
        ["0", ""],
        ["8", "102"],
      ]),
    ).toEqual({
      "1-0": "Station must be greater than the previous row.",
      "1-1": "Enter a number.",
    });
  });
  it("keeps survey edits as a draft, rejects unordered stations and reverts to applied coordinates", () => {
    const project = createProject(true),
      update = vi.fn();
    render(
      <SurveyGrid
        project={project}
        section={0}
        update={update}
        notify={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("Row 2 station");
    fireEvent.change(input, { target: { value: "0" } });
    expect(
      screen
        .getByRole("button", { name: "Apply coordinates" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByText("Station must be greater than the previous row."),
    ).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Revert" }));
    expect((input as HTMLInputElement).value).toBe(
      String(project.inputs.sections[0].points[1].station),
    );
    fireEvent.paste(screen.getByLabelText("Row 1 station"), {
      clipboardData: { getData: () => "station,elevation\n0,106\n8,103.5" },
    });
    expect(
      (screen.getByLabelText("Row 2 elevation") as HTMLInputElement).value,
    ).toBe("103.5");
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply coordinates" }));
    expect(update.mock.calls[0][0].inputs.sections[0].points[1].elevation).toBe(
      103.5,
    );
    expect(update.mock.calls[0][0].inputs.sections[1]).toEqual(
      project.inputs.sections[1],
    );
  });
  it("adds and removes blank survey rows without silently assigning zero", () => {
    render(
      <SurveyGrid
        project={createProject(true)}
        section={0}
        update={vi.fn()}
        notify={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Insert row after 1" }));
    expect(
      (screen.getByLabelText("Row 2 station") as HTMLInputElement).value,
    ).toBe("");
    expect(
      screen
        .getByRole("button", { name: "Apply coordinates" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "Remove survey row 2" }),
    );
    expect(
      screen
        .getByRole("button", { name: "Apply coordinates" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
  it("pastes flow blocks atomically and preserves event identity and comparison levels", () => {
    const flows = createProject(true).inputs.flows;
    flows[0].reference = 102.2;
    const next = pasteFlowCells(
      flows,
      'event,discharge_m3s,tailwater_m,source\nFrequent,38,102.1,"Model A, run 2"',
      0,
      0,
    );
    expect(next[0]).toMatchObject({
      id: flows[0].id,
      discharge: 38,
      tailwater: 102.1,
      source: "Model A, run 2",
      reference: 102.2,
    });
    expect(flows[0].discharge).toBe(35);
    expect(() => pasteFlowCells(flows, "-4\t102", 0, 1)).toThrow(
      "positive discharge",
    );
    expect(() =>
      pasteFlowCells(flows, `${flows[1].name}\t35\t102`, 0, 0),
    ).toThrow("unique name");
    expect(
      pasteFlowCells(flows, "New event\t90\t104\tModel A", 3, 0),
    ).toHaveLength(4);
  });
  it("shows an external pasted number after the field was manually edited", () => {
    const onChange = vi.fn();
    const view = render(
      <NumberField label="Discharge" value={35} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Discharge"), {
      target: { value: "36" },
    });
    view.rerender(
      <NumberField label="Discharge" value={36} onChange={onChange} />,
    );
    view.rerender(
      <NumberField label="Discharge" value={50} onChange={onChange} />,
    );
    expect((screen.getByLabelText("Discharge") as HTMLInputElement).value).toBe(
      "50",
    );
    fireEvent.change(screen.getByLabelText("Discharge"), {
      target: { value: "" },
    });
    view.rerender(
      <NumberField
        label="Discharge"
        value={50}
        resetKey={1}
        onChange={onChange}
      />,
    );
    expect((screen.getByLabelText("Discharge") as HTMLInputElement).value).toBe(
      "50",
    );
  });
});

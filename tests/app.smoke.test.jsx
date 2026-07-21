// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

describe("App smoke render", () => {
  it("mounts without throwing and shows the header", async () => {
    const { default: App } = await import("../src/App.jsx");
    render(<App />);
    expect(screen.getByText("The Painter's Wheel")).toBeTruthy();
    expect(screen.getByText("Lessons")).toBeTruthy();
  });

  it("switches to every tab without crashing", async () => {
    const { default: App } = await import("../src/App.jsx");
    render(<App />);
    for (const label of ["Your Canvas", "Colour Wheel", "Zorn Palette", "Paintbox", "Lessons"]) {
      fireEvent.click(screen.getAllByText(label)[0]);
    }
  });
});

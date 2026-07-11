import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { useRef } from "react";

// --- Mock the Supabase client so we control the translate-ui network call. ---
const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

import { LanguageProvider, useLanguage } from "@/i18n/LanguageContext";
import { AutoTranslateProvider } from "@/i18n/AutoTranslateProvider";
import { usePageAutoTranslate } from "@/i18n/usePageAutoTranslate";

/** A page that runs the auto-translator over its own content. */
function TranslatablePage() {
  const ref = useRef<HTMLDivElement>(null);
  usePageAutoTranslate(ref);
  return (
    <div ref={ref}>
      <p>Hello world this is some translatable content.</p>
    </div>
  );
}

/** Exposes setLanguage so tests can trigger a language switch. */
function LanguageSwitch() {
  const { setLanguage } = useLanguage();
  return (
    <>
      <button onClick={() => setLanguage("fr")}>switch-to-fr</button>
      <button onClick={() => setLanguage("en")}>switch-to-en</button>
    </>
  );
}

function renderApp() {
  return render(
    <LanguageProvider>
      <AutoTranslateProvider>
        <LanguageSwitch />
        <TranslatablePage />
      </AutoTranslateProvider>
    </LanguageProvider>,
  );
}

const spinner = () => screen.queryByText("Translating…");

describe("auto-translate spinner visibility", () => {
  beforeEach(() => {
    localStorage.clear();
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not show the spinner for the default (English) language", () => {
    localStorage.setItem("language", "en");
    renderApp();
    expect(spinner()).not.toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("shows the spinner during a network fetch, then hides it when done", async () => {
    localStorage.setItem("language", "en");

    // A deferred invoke so we can assert the spinner while the request is pending.
    let resolveInvoke!: (v: unknown) => void;
    invokeMock.mockReturnValue(
      new Promise((resolve) => {
        resolveInvoke = resolve;
      }),
    );

    renderApp();

    // Switch to French → triggers a network fetch (no cache yet).
    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });

    // Spinner should be visible while the request is in flight.
    await waitFor(() => expect(spinner()).toBeInTheDocument());
    expect(invokeMock).toHaveBeenCalledTimes(1);

    // Resolve the request → spinner should disappear.
    await act(async () => {
      resolveInvoke({
        data: { translations: ["Bonjour le monde ceci est du contenu traduisible."] },
        error: null,
      });
    });

    await waitFor(() => expect(spinner()).not.toBeInTheDocument());
  });

  it("never shows the spinner when serving a cached translation", async () => {
    localStorage.setItem("language", "en");

    // First pass: perform a real (mocked) fetch so the result gets cached.
    invokeMock.mockResolvedValue({
      data: { translations: ["Bonjour le monde ceci est du contenu traduisible."] },
      error: null,
    });

    const first = renderApp();
    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });
    await waitFor(() => expect(spinner()).not.toBeInTheDocument());
    expect(invokeMock).toHaveBeenCalledTimes(1);
    first.unmount();

    // Second pass: start already in French. The cache should serve instantly
    // with NO network call and NO spinner at any point.
    invokeMock.mockReset();
    localStorage.setItem("language", "fr");

    renderApp();

    // Give effects a chance to run — the spinner must never appear.
    await act(async () => {
      await Promise.resolve();
    });

    expect(spinner()).not.toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe("auto-translate overlay clears on cancellation", () => {
  beforeEach(() => {
    localStorage.clear();
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hides the overlay when the component unmounts mid-fetch", async () => {
    localStorage.setItem("language", "en");

    // A request that never resolves — simulates an in-flight/hanging fetch.
    invokeMock.mockReturnValue(new Promise(() => {}));

    const app = renderApp();

    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });
    await waitFor(() => expect(spinner()).toBeInTheDocument());

    // Unmount while the request is still pending.
    await act(async () => {
      app.unmount();
    });

    // The overlay lives in the same tree, so unmount removes it entirely.
    expect(spinner()).not.toBeInTheDocument();
  });

  it("hides the overlay when the language switches back mid-fetch", async () => {
    localStorage.setItem("language", "en");

    // First switch → hanging request keeps the spinner up.
    invokeMock.mockReturnValue(new Promise(() => {}));

    renderApp();

    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });
    await waitFor(() => expect(spinner()).toBeInTheDocument());

    // Switch back to English — cancels the pending run. English needs no
    // network work, so the overlay must clear.
    await act(async () => {
      screen.getByText("switch-to-en").click();
    });

    await waitFor(() => expect(spinner()).not.toBeInTheDocument());
  });
});


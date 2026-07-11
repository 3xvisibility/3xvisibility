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
import {
  usePageAutoTranslate,
  backoffDelay,
  BACKOFF_BASE_MS,
  MAX_RETRIES,
} from "@/i18n/usePageAutoTranslate";

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

/** Number of paragraphs → forces multiple network batches (BATCH_SIZE = 20). */
const MULTI_SECTION_COUNT = 45;

/** A page with many text nodes so translation spans several sections/batches. */
function MultiSectionPage() {
  const ref = useRef<HTMLDivElement>(null);
  usePageAutoTranslate(ref);
  return (
    <div ref={ref}>
      {Array.from({ length: MULTI_SECTION_COUNT }, (_, i) => (
        <p key={i}>{`Section paragraph number ${i + 1} with translatable words.`}</p>
      ))}
    </div>
  );
}

function renderMultiApp() {
  return render(
    <LanguageProvider>
      <AutoTranslateProvider>
        <LanguageSwitch />
        <MultiSectionPage />
      </AutoTranslateProvider>
    </LanguageProvider>,
  );
}

/** Success mock that echoes back a translated variant per input text. */
function translateEcho() {
  return async (_path: string, opts: { body: { texts: string[] } }) => ({
    data: { translations: opts.body.texts.map((t) => `FR:${t}`) },
    error: null,
  });
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

const errorCard = () => screen.queryByText("Translation failed");

describe("auto-translate retry after failure", () => {
  beforeEach(() => {
    localStorage.clear();
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows an error with a Retry button when every attempt fails", async () => {
    localStorage.setItem("language", "en");

    // API returns an error object on every call → all retries exhaust.
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "Service unavailable" },
    });

    renderApp();

    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });

    await waitFor(() => expect(errorCard()).toBeInTheDocument(), { timeout: 6000 });
    expect(screen.getByText("Retry")).toBeInTheDocument();
    // Spinner should be gone once the failure surfaces.
    expect(spinner()).not.toBeInTheDocument();
  }, 10000);

  it("re-attempts on Retry and clears the error when it succeeds", async () => {
    localStorage.setItem("language", "en");

    // First run fails on every attempt.
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "Network error" },
    });

    renderApp();

    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });

    await waitFor(() => expect(errorCard()).toBeInTheDocument(), { timeout: 6000 });

    const callsBeforeRetry = invokeMock.mock.calls.length;
    expect(callsBeforeRetry).toBeGreaterThan(0);

    // Now the service recovers.
    invokeMock.mockResolvedValue({
      data: { translations: ["Bonjour le monde ceci est du contenu traduisible."] },
      error: null,
    });

    await act(async () => {
      screen.getByText("Retry").click();
    });

    // Error clears once the retry succeeds.
    await waitFor(() => expect(errorCard()).not.toBeInTheDocument(), { timeout: 6000 });
    // A fresh network attempt was made after clicking Retry.
    expect(invokeMock.mock.calls.length).toBeGreaterThan(callsBeforeRetry);
    expect(spinner()).not.toBeInTheDocument();
  }, 10000);
});

describe("auto-translate exponential backoff", () => {
  beforeEach(() => {
    localStorage.clear();
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("computes exponentially increasing delays from the base", () => {
    expect(backoffDelay(0)).toBe(BACKOFF_BASE_MS); // 600
    expect(backoffDelay(1)).toBe(BACKOFF_BASE_MS * 2); // 1200
    expect(backoffDelay(2)).toBe(BACKOFF_BASE_MS * 4); // 2400
    // Each step is exactly double the previous.
    expect(backoffDelay(1) / backoffDelay(0)).toBe(2);
    expect(backoffDelay(2) / backoffDelay(1)).toBe(2);
  });

  it("retries with the expected backoff delays and stops at MAX_RETRIES", async () => {
    localStorage.setItem("language", "en");

    // Every attempt fails so the full retry sequence runs.
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "Service unavailable" },
    });

    // Capture the delays passed to setTimeout so we can inspect the backoff.
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    renderApp();

    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });

    await waitFor(() => expect(errorCard()).toBeInTheDocument(), { timeout: 6000 });

    // Total network attempts for the single batch = MAX_RETRIES + 1.
    expect(invokeMock).toHaveBeenCalledTimes(MAX_RETRIES + 1);

    // The backoff sleeps use delays 600 then 1200 (no sleep after the final
    // attempt). Filter setTimeout calls down to the backoff delays we expect.
    const delays = setTimeoutSpy.mock.calls.map((c) => c[1]);
    const expectedBackoffs = Array.from({ length: MAX_RETRIES }, (_, i) => backoffDelay(i));
    for (const expected of expectedBackoffs) {
      expect(delays).toContain(expected);
    }

    // There must be exactly MAX_RETRIES backoff waits (one fewer than attempts).
    const backoffCalls = delays.filter((d) => expectedBackoffs.includes(d as number));
    expect(backoffCalls).toHaveLength(MAX_RETRIES);

    // And no wait for a would-be attempt beyond the cap (e.g. 2400ms).
    expect(delays).not.toContain(backoffDelay(MAX_RETRIES));
  }, 10000);
});

describe("auto-translate caching across multiple sections", () => {
  beforeEach(() => {
    localStorage.clear();
    invokeMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const expectedBatches = Math.ceil(MULTI_SECTION_COUNT / 20);

  it("fetches each section once, then serves the whole page from cache with no network", async () => {
    localStorage.setItem("language", "en");
    invokeMock.mockImplementation(translateEcho());

    // First pass: performs the multi-batch network fetch and caches the result.
    const first = renderMultiApp();
    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });
    await waitFor(() => expect(spinner()).not.toBeInTheDocument(), { timeout: 6000 });

    // One network call per section/batch.
    expect(invokeMock).toHaveBeenCalledTimes(expectedBatches);
    expect(expectedBatches).toBeGreaterThan(1);
    first.unmount();

    // Second pass: start already in French. Every section is cached, so there
    // must be ZERO network calls and the spinner must never appear.
    invokeMock.mockReset();
    invokeMock.mockImplementation(translateEcho());
    localStorage.setItem("language", "fr");

    renderMultiApp();
    await act(async () => {
      await Promise.resolve();
    });

    expect(spinner()).not.toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  }, 15000);

  it("does not cache (and re-fetches) when one section fails", async () => {
    localStorage.setItem("language", "en");

    // Fail only the second batch; the rest succeed.
    let call = 0;
    invokeMock.mockImplementation(async (_path: string, opts: { body: { texts: string[] } }) => {
      call += 1;
      if (call === 2) {
        return { data: null, error: { message: "boom" } };
      }
      return { data: { translations: opts.body.texts.map((t) => `FR:${t}`) }, error: null };
    });

    const first = renderMultiApp();
    await act(async () => {
      screen.getByText("switch-to-fr").click();
    });
    // Failing batch retries, so wait generously for the run to settle.
    await waitFor(() => expect(spinner()).not.toBeInTheDocument(), { timeout: 8000 });
    first.unmount();

    // Nothing should have been cached — a fresh French mount must hit the network again.
    invokeMock.mockReset();
    invokeMock.mockImplementation(translateEcho());
    localStorage.setItem("language", "fr");

    renderMultiApp();
    await waitFor(() => expect(invokeMock).toHaveBeenCalled(), { timeout: 6000 });
    expect(invokeMock.mock.calls.length).toBe(expectedBatches);
  }, 20000);
});





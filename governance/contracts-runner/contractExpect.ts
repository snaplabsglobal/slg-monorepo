import { expect, Page } from "@playwright/test";

/**
 * Contract Expect Helpers
 *
 * Common assertions for Business Contract E2E tests
 */

export async function expectNoRedirectLoop(page: Page, path: string, timeoutMs = 10000) {
  let sawLoop = false;

  const handler = async (res: any) => {
    if (res.url().includes(path) && res.status() === 307) {
      const loc = res.headers()["location"];
      if (loc?.includes("/login")) sawLoop = true;
    }
  };

  page.on("response", handler);
  await page.waitForTimeout(timeoutMs);
  page.off("response", handler);

  expect(sawLoop, `Forbidden redirect loop: ${path} -> 307 -> /login`).toBeFalsy();
}

export async function expectFirstResponse200(page: Page, path: string): Promise<number | null> {
  let status: number | null = null;

  const handler = (res: any) => {
    if (res.url().includes(path) && status === null) {
      status = res.status();
    }
  };

  page.on("response", handler);
  await page.waitForTimeout(3000);
  page.off("response", handler);

  expect(status, `${path} first response must be 200`).toBe(200);
  return status;
}

export function expectConsoleClean(
  errors: string[],
  blocklist = ["AbortError", "InvalidStateError", "Unhandled"]
): string[] {
  const bad = errors.filter((t) => blocklist.some((b) => t.includes(b)));
  expect(bad, `Console must be clean. Got:\n${bad.join("\n")}`).toHaveLength(0);
  return bad;
}

export function setupConsoleCapture(page: Page): string[] {
  const consoleErrors: string[] = [];

  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  return consoleErrors;
}

export function setupFirstResponseCapture(page: Page, path: string): { getStatus: () => number | null } {
  let status: number | null = null;

  page.on("response", (res) => {
    if (status === null && res.url().includes(path)) {
      status = res.status();
    }
  });

  return { getStatus: () => status };
}

export function setupRedirectLoopDetector(page: Page, path: string): { sawLoop: () => boolean } {
  let sawLoop = false;

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes(path) && res.status() === 307) {
      const headers = res.headers();
      const loc = headers["location"] || headers["Location"];
      if (loc?.includes("/login")) {
        sawLoop = true;
      }
    }
  });

  return { sawLoop: () => sawLoop };
}

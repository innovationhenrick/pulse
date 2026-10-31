import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

// Components read their text through next-intl. Tests render them without a provider, in English.
vi.mock("next-intl", async (importOriginal) => {
  const real = await importOriginal<typeof import("next-intl")>();
  const { default: messages } = await import("./messages/en.json");
  return {
    ...real,
    useLocale: () => "en",
    useTranslations: (namespace?: string) => real.createTranslator({ locale: "en", messages, namespace } as never),
  };
});

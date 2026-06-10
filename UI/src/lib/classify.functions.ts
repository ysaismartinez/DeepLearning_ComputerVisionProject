import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ClassifyInput = z.object({
  imageDataUrl: z
    .string()
    .min(1)
    .max(15_000_000)
    .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,/),
});

type Probs = { Dog: number; Cat: number; Other: number };

function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? (n as number) : 0;
}

function parseModelJson(text: string): { predicted?: string; probabilities: Probs } {
  // Strip code fences and grab the first JSON object.
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? match[0] : text;
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    obj = {};
  }
  const predicted = (obj.predicted ??
    obj.classification ??
    obj.class ??
    obj.label) as string | undefined;
  const p = (obj.probabilities ?? obj.probs ?? obj.scores ?? {}) as Record<
    string,
    unknown
  >;
  const pick = (...keys: string[]) => {
    for (const k of Object.keys(p)) {
      if (keys.some((kk) => kk.toLowerCase() === k.toLowerCase())) return num(p[k]);
    }
    return 0;
  };
  return {
    predicted,
    probabilities: {
      Dog: pick("Dog", "dog"),
      Cat: pick("Cat", "cat"),
      Other: pick("Other", "other"),
    },
  };
}

export type ClassificationResult = {
  predicted: "Dog" | "Cat" | "Other";
  confidence: number;
  probabilities: { Dog: number; Cat: number; Other: number };
};

function normalize(probs: { Dog: number; Cat: number; Other: number }) {
  const clamp = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  let d = clamp(probs.Dog);
  let c = clamp(probs.Cat);
  let o = clamp(probs.Other);
  const sum = d + c + o;
  if (sum <= 0) return { Dog: 0, Cat: 0, Other: 1 };
  // If values look like 0-100, they still normalize fine.
  return { Dog: d / sum, Cat: c / sum, Other: o / sum };
}

export const classifyAnimal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ClassifyInput.parse(input))
  .handler(async ({ data }): Promise<ClassificationResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        body: formData,
      });

    const result = await response.json();

    const parsed = parseModelJson(text);
    const probs = normalize(parsed.probabilities);
    const entries = Object.entries(probs) as Array<[
      "Dog" | "Cat" | "Other",
      number,
    ]>;
    entries.sort((a, b) => b[1] - a[1]);

    const valid: Array<"Dog" | "Cat" | "Other"> = ["Dog", "Cat", "Other"];
    const predicted =
      parsed.predicted && valid.includes(parsed.predicted as never)
        ? (parsed.predicted as "Dog" | "Cat" | "Other")
        : entries[0][0];
    const confidence = probs[predicted];

    return { predicted, confidence, probabilities: probs };
  });

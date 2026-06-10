import { createFileRoute } from "@tanstack/react-router";
import { Cpu, GitBranch, Layers, CheckCircle2, Info } from "lucide-react";

export const Route = createFileRoute("/model-info")({
  head: () => ({
    meta: [
      { title: "Model Info — PetVision" },
      {
        name: "description",
        content:
          "Learn about the three classification models behind PetVision: Naive Baseline, HOG + Random Forest, and MobileNetV2 transfer learning.",
      },
    ],
  }),
  component: ModelInfoPage,
});

const MODELS = [
  {
    icon: Layers,
    name: "Naive Baseline",
    tag: "Reference",
    desc: "Predicts the majority class for every image. Establishes the floor any real model must beat and exposes class imbalance in the dataset.",
    accuracy: 0.512,
    f1: 0.226,
  },
  {
    icon: GitBranch,
    name: "HOG + Random Forest",
    tag: "Classical ML",
    desc: "Extracts Histogram of Oriented Gradients features and feeds them into a Random Forest ensemble. Fast and interpretable, but limited on subtle visual cues.",
    accuracy: 0.788,
    f1: 0.771,
  },
  {
    icon: Cpu,
    name: "MobileNetV2 Transfer Learning",
    tag: "Deployed",
    desc: "A MobileNetV2 backbone pretrained on ImageNet, fine-tuned on shelter intake photos. Best accuracy with a lightweight footprint suitable for real-time use.",
    accuracy: 0.951,
    f1: 0.949,
    deployed: true,
  },
];

function ModelInfoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          How PetVision Classifies Animals
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          We evaluated three approaches of increasing sophistication. The
          deployed system uses the strongest performer to balance accuracy with
          real-time speed.
        </p>
      </div>

      {/* Model cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {MODELS.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.name}
              className={
                "relative rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] " +
                (m.deployed ? "border-primary ring-1 ring-primary/30" : "border-border")
              }
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5.5 w-5.5" />
              </span>
              <div className="mt-3 flex items-center gap-2">
                <h2 className="text-base font-semibold">{m.name}</h2>
              </div>
              <span
                className={
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                  (m.deployed
                    ? "bg-success/20 text-success-foreground"
                    : "bg-secondary text-secondary-foreground")
                }
              >
                {m.tag}
              </span>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {m.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border bg-secondary/50 px-5 py-3">
          <h2 className="font-semibold">Performance comparison</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-semibold">Model</th>
              <th className="px-5 py-3 font-semibold">Accuracy</th>
              <th className="px-5 py-3 font-semibold">Macro F1</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m) => (
              <tr
                key={m.name}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-5 py-3 font-medium">
                  <span className="inline-flex items-center gap-2">
                    {m.name}
                    {m.deployed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/20 px-2 py-0.5 text-[11px] font-semibold text-success-foreground">
                        <CheckCircle2 className="h-3 w-3" /> Deployed
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${m.accuracy * 100}%` }}
                      />
                    </div>
                    <span className="tabular-nums font-semibold">
                      {(m.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${m.f1 * 100}%` }}
                      />
                    </div>
                    <span className="tabular-nums font-semibold">
                      {(m.f1 * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Note */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          The currently deployed model is{" "}
          <span className="font-semibold">MobileNetV2 Transfer Learning</span> at{" "}
          <span className="font-semibold">95.1% accuracy</span>. Predictions with
          confidence below 80% are flagged for manual review to keep intake
          records reliable.
        </p>
      </div>
    </div>
  );
}

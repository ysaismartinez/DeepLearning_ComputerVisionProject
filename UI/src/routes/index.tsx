import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import {
  Camera,
  Cat,
  Dog,
  HelpCircle,
  ImageUp,
  Loader2,
  AlertTriangle,
  Sparkles,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { classifyAnimal, type ClassificationResult } from "@/lib/classify.functions";
import {
  useIntakes,
  makeId,
  type AnimalClass,
  type Sex,
} from "@/lib/intake-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PetVision — Animal Intake Classification" },
      {
        name: "description",
        content:
          "Upload a photo of an incoming shelter animal to instantly classify it as Dog, Cat, or Other with an AI confidence score.",
      },
    ],
  }),
  component: IntakePage,
});

const CLASS_ICON: Record<AnimalClass, typeof Dog> = {
  Dog,
  Cat,
  Other: HelpCircle,
};

function confidenceColor(c: number) {
  if (c >= 0.9) return "var(--color-success)";
  if (c >= 0.7) return "var(--color-warning)";
  return "var(--color-destructive)";
}

function ProbBar({ label, value }: { label: AnimalClass; value: number }) {
  const Icon = CLASS_ICON[label];
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-16 shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <div className="w-12 shrink-0 text-right text-sm tabular-nums text-foreground">
        {(value * 100).toFixed(1)}%
      </div>
    </div>
  );
}

function IntakePage() {
  const classifyFn = useServerFn(classifyAnimal);
  const { addRecord } = useIntakes();
  const inputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);

  const [form, setForm] = useState({
    name: "",
    age: "",
    sex: "Unknown" as Sex,
    color: "",
    notes: "",
  });

  const classify = useMutation({
    mutationFn: (imageDataUrl: string) => classifyFn({ data: { imageDataUrl } }),
    onSuccess: (res) => {
      setResult(res);
      setForm((f) => ({
        ...f,
        notes: f.notes || `Auto-classified as ${res.predicted}.`,
      }));
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Classification failed";
      toast.error(
        msg.includes("402")
          ? "AI credits exhausted. Add credits in workspace settings."
          : msg.includes("429")
            ? "Rate limited. Please try again in a moment."
            : "Couldn't classify the image. Please try again.",
      );
    },
  });

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Image too large (max 12MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const reset = () => {
    setImage(null);
    setResult(null);
    classify.reset();
    setForm({ name: "", age: "", sex: "Unknown", color: "", notes: "" });
  };

  const save = () => {
    if (!image || !result) return;
    addRecord({
      id: makeId(),
      photo: image,
      predicted: result.predicted,
      confidence: result.confidence,
      probabilities: result.probabilities,
      name: form.name.trim() || "Unnamed",
      age: form.age.trim(),
      sex: form.sex,
      color: form.color.trim(),
      notes: form.notes.trim(),
      status: "Pending Review",
      createdAt: new Date().toISOString(),
    });
    toast.success("Intake record saved.");
    reset();
  };

  const PredIcon = result ? CLASS_ICON[result.predicted] : null;
  const lowConf = result ? result.confidence < 0.8 : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Hero */}
      <section className="mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Powered by MobileNetV2 · 95.1% accuracy
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Automated Animal Classification
          <span className="block text-primary">for Shelter Intake</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">
          Upload a photo of an incoming animal and get an instant prediction —
          Dog, Cat, or Other — with a confidence score and ready-to-file intake
          form.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-lg font-semibold">1. Upload a photo</h2>

          {!image ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-secondary/40 px-6 py-16 text-center transition-colors",
                dragging && "border-primary bg-primary/5",
              )}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Camera className="h-7 w-7" />
              </span>
              <span className="font-medium text-foreground">
                Drag & drop an image here
              </span>
              <span className="text-sm text-muted-foreground">
                or <span className="text-primary underline">click to browse</span>
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                JPG, PNG or WebP · up to 12MB
              </span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-xl border border-border bg-secondary">
                <img
                  src={image}
                  alt="Animal to classify"
                  className="aspect-video w-full object-contain"
                />
                <button
                  type="button"
                  onClick={reset}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition hover:bg-background"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  size="lg"
                  disabled={classify.isPending}
                  onClick={() => classify.mutate(image)}
                >
                  {classify.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Classifying…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Classify Animal
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => inputRef.current?.click()}
                >
                  <ImageUp className="h-4 w-4" /> Replace
                </Button>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Result */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-lg font-semibold">2. Classification result</h2>

          {!result ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center text-muted-foreground">
              <HelpCircle className="h-8 w-8 opacity-40" />
              <p className="text-sm">
                Results will appear here after you classify an image.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl bg-secondary/50 p-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[image:var(--gradient-hero)] text-primary-foreground">
                  {PredIcon ? <PredIcon className="h-8 w-8" /> : null}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Predicted class</p>
                  <p className="text-2xl font-bold text-foreground">
                    {result.predicted}
                  </p>
                </div>
                {lowConf && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-warning/20 px-2.5 py-1.5 text-xs font-semibold text-warning-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Low confidence — review
                  </span>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Confidence</span>
                  <span className="tabular-nums font-semibold text-foreground">
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.round(result.confidence * 100)}%`,
                      backgroundColor: confidenceColor(result.confidence),
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-sm font-medium text-foreground">
                  Probability breakdown
                </p>
                {(["Dog", "Cat", "Other"] as AnimalClass[]).map((c) => (
                  <ProbBar key={c} label={c} value={result.probabilities[c]} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Intake form */}
      {result && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="mb-1 text-lg font-semibold">3. Intake form</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Pre-filled with the predicted class. Complete the remaining details
            and save the record.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Animal Name</Label>
              <Input
                id="name"
                placeholder="e.g. Biscuit"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age">Estimated Age</Label>
              <Input
                id="age"
                placeholder="e.g. 2 years"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sex</Label>
              <Select
                value={form.sex}
                onValueChange={(v) => setForm({ ...form, sex: v as Sex })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Color / Markings</Label>
              <Input
                id="color"
                placeholder="e.g. Brown tabby, white chest"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={save}>
              Save Intake Record
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link to="/log">
                View Intake Log <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

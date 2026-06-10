import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Cat,
  Dog,
  HelpCircle,
  CheckCircle2,
  Pencil,
  Inbox,
  CalendarDays,
  Target,
  ClipboardClock,
} from "lucide-react";
import { toast } from "sonner";

import {
  useIntakes,
  type AnimalClass,
  type IntakeRecord,
  type IntakeStatus,
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Intake Log — PetVision" },
      {
        name: "description",
        content:
          "Browse, filter, edit and confirm all saved animal intake records in PetVision.",
      },
    ],
  }),
  component: LogPage,
});

const CLASS_ICON: Record<AnimalClass, typeof Dog> = {
  Dog,
  Cat,
  Other: HelpCircle,
};

function StatusBadge({ status }: { status: IntakeStatus }) {
  const styles: Record<IntakeStatus, string> = {
    "Pending Review": "bg-warning/20 text-warning-foreground",
    Confirmed: "bg-success/20 text-success-foreground",
    Overridden: "bg-secondary text-secondary-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

function confColor(c: number) {
  if (c >= 0.9) return "var(--color-success)";
  if (c >= 0.7) return "var(--color-warning)";
  return "var(--color-destructive)";
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Dog;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function LogPage() {
  const { records, updateRecord } = useIntakes();
  const [classFilter, setClassFilter] = useState<"All" | AnimalClass>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | IntakeStatus>("All");
  const [editing, setEditing] = useState<IntakeRecord | null>(null);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = records.filter(
      (r) => new Date(r.createdAt).toDateString() === today,
    ).length;
    const pending = records.filter((r) => r.status === "Pending Review").length;
    const avg =
      records.length === 0
        ? 0
        : records.reduce((s, r) => s + r.confidence, 0) / records.length;
    return { todayCount, pending, avg };
  }, [records]);

  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          (classFilter === "All" || r.predicted === classFilter) &&
          (statusFilter === "All" || r.status === statusFilter),
      ),
    [records, classFilter, statusFilter],
  );

  const confirm = (id: string) => {
    updateRecord(id, { status: "Confirmed" });
    toast.success("Record confirmed.");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Intake Log
          </h1>
          <p className="mt-1 text-muted-foreground">
            All saved animal intake records.
          </p>
        </div>
        <Button asChild>
          <Link to="/">New Intake</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          icon={CalendarDays}
          label="Intakes today"
          value={String(stats.todayCount)}
        />
        <Stat
          icon={Target}
          label="Avg. model confidence"
          value={`${(stats.avg * 100).toFixed(1)}%`}
        />
        <Stat
          icon={ClipboardClock}
          label="Pending reviews"
          value={String(stats.pending)}
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Class</span>
          <Select
            value={classFilter}
            onValueChange={(v) => setClassFilter(v as "All" | AnimalClass)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All", "Dog", "Cat", "Other"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Status
          </span>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "All" | IntakeStatus)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All", "Pending Review", "Confirmed", "Overridden"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 opacity-40" />
            <p>No records match your filters.</p>
            <Button asChild variant="outline">
              <Link to="/">Classify an animal</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Photo</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Confidence</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Age</th>
                  <th className="px-4 py-3 font-semibold">Sex</th>
                  <th className="px-4 py-3 font-semibold">Date / Time</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const Icon = CLASS_ICON[r.predicted];
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-border/70 last:border-0 hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.id}
                      </td>
                      <td className="px-4 py-3">
                        <img
                          src={r.photo}
                          alt={r.name}
                          className="h-12 w-12 rounded-lg border border-border object-cover"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Icon className="h-4 w-4 text-primary" />
                          {r.predicted}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(r.confidence * 100)}%`,
                                backgroundColor: confColor(r.confidence),
                              }}
                            />
                          </div>
                          <span className="tabular-nums text-xs">
                            {(r.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.age || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.sex}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditing(r)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            disabled={r.status === "Confirmed"}
                            onClick={() => confirm(r.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EditDialog
        record={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => {
          if (editing) updateRecord(editing.id, patch);
          setEditing(null);
          toast.success("Record updated.");
        }}
      />
    </div>
  );
}

function EditDialog({
  record,
  onClose,
  onSave,
}: {
  record: IntakeRecord | null;
  onClose: () => void;
  onSave: (patch: Partial<IntakeRecord>) => void;
}) {
  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {record && (
          <EditForm key={record.id} record={record} onSave={onSave} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  record,
  onSave,
}: {
  record: IntakeRecord;
  onSave: (patch: Partial<IntakeRecord>) => void;
}) {
  const [form, setForm] = useState({
    name: record.name,
    age: record.age,
    sex: record.sex,
    color: record.color,
    notes: record.notes,
    predicted: record.predicted,
    status: record.status,
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit record · {record.id}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 py-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Animal Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Estimated Age</Label>
          <Input
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Predicted Class</Label>
          <Select
            value={form.predicted}
            onValueChange={(v) =>
              setForm({ ...form, predicted: v as AnimalClass })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Dog", "Cat", "Other"].map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              {["Male", "Female", "Unknown"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Color / Markings</Label>
          <Input
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) =>
              setForm({ ...form, status: v as IntakeStatus })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Pending Review", "Confirmed", "Overridden"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave(form)}>Save Changes</Button>
      </DialogFooter>
    </>
  );
}

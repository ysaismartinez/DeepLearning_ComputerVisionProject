import { useCallback, useEffect, useState } from "react";

export type AnimalClass = "Dog" | "Cat" | "Other";
export type IntakeStatus = "Pending Review" | "Confirmed" | "Overridden";
export type Sex = "Male" | "Female" | "Unknown";

export interface IntakeRecord {
  id: string;
  photo: string; // data url
  predicted: AnimalClass;
  confidence: number;
  probabilities: { Dog: number; Cat: number; Other: number };
  name: string;
  age: string;
  sex: Sex;
  color: string;
  notes: string;
  status: IntakeStatus;
  createdAt: string; // ISO
}

const STORAGE_KEY = "petvision.intakes.v1";
const EVENT = "petvision-intakes-changed";

function read(): IntakeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as IntakeRecord[];
  } catch {
    return [];
  }
}

function write(records: IntakeRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(EVENT));
}

export function makeId() {
  const n = read().length + 1;
  return "PV-" + String(n).padStart(4, "0");
}

export function useIntakes() {
  const [records, setRecords] = useState<IntakeRecord[]>([]);

  useEffect(() => {
    const sync = () => setRecords(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addRecord = useCallback((record: IntakeRecord) => {
    const all = read();
    write([record, ...all]);
  }, []);

  const updateRecord = useCallback(
    (id: string, patch: Partial<IntakeRecord>) => {
      const all = read().map((r) => (r.id === id ? { ...r, ...patch } : r));
      write(all);
    },
    [],
  );

  const removeRecord = useCallback((id: string) => {
    write(read().filter((r) => r.id !== id));
  }, []);

  return { records, addRecord, updateRecord, removeRecord };
}

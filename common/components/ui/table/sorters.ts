"use client";

type Nullable<T> = T | null | undefined;

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function normalizeText(value: Nullable<string | number>) {
  return String(value ?? "").trim();
}

function toTime(value: Nullable<string | Date>) {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function textSorter<T>(pick: (row: T) => Nullable<string | number>) {
  return (a: T, b: T) => collator.compare(normalizeText(pick(a)), normalizeText(pick(b)));
}

export function numberSorter<T>(pick: (row: T) => Nullable<number>) {
  return (a: T, b: T) => (pick(a) ?? 0) - (pick(b) ?? 0);
}

export function dateSorter<T>(pick: (row: T) => Nullable<string | Date>) {
  return (a: T, b: T) => toTime(pick(a)) - toTime(pick(b));
}

export function booleanSorter<T>(pick: (row: T) => Nullable<boolean>) {
  return (a: T, b: T) => Number(Boolean(pick(a))) - Number(Boolean(pick(b)));
}

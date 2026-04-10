export function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (value == null) {
    return 0;
  }

  return Number(value);
}

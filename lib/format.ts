import type { DeadlineFlag } from "@/lib/domain/deadlines";

export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** Tailwind text-colour class for a deadline window flag. */
export function flagClass(flag: DeadlineFlag): string {
  switch (flag) {
    case "red":
      return "text-flag-red";
    case "amber":
      return "text-flag-amber";
    case "yellow":
      return "text-flag-yellow";
    default:
      return "text-gray-400";
  }
}

export const flagLabel = (flag: DeadlineFlag) => flag ?? "—";

export type HapticEvent =
  | "throw"
  | "remove"
  | "impactLight"
  | "impactHeavy"
  | "pulse"
  | "success"
  | "fail";

const PATTERNS: Record<HapticEvent, number | number[]> = {
  throw: 8,
  remove: 12,
  impactLight: 7,
  impactHeavy: 18,
  pulse: [12, 18, 20],
  success: [12, 30, 18, 30, 26],
  fail: [24, 24, 24],
};

export class Haptics {
  private lastAt = 0;

  trigger(event: HapticEvent): void {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
      return;
    }
    const now = performance.now();
    if (now - this.lastAt < 65 && event.startsWith("impact")) {
      return;
    }
    this.lastAt = now;
    try {
      navigator.vibrate(PATTERNS[event]);
    } catch {
      // Vibration support and permissions vary by browser/device.
    }
  }
}

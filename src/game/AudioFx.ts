export type AudioFxName =
  | "throw"
  | "impactLight"
  | "impactHeavy"
  | "pulse"
  | "goal"
  | "uiClick";

type Preset = {
  wave: OscillatorType;
  frequency: number;
  frequencyEnd: number;
  duration: number;
  gain: number;
};

const sounds: Record<AudioFxName, Preset> = {
  throw: { wave: "sine", frequency: 210, frequencyEnd: 115, duration: 0.16, gain: 0.15 },
  impactLight: { wave: "triangle", frequency: 145, frequencyEnd: 82, duration: 0.09, gain: 0.12 },
  impactHeavy: { wave: "sine", frequency: 82, frequencyEnd: 42, duration: 0.24, gain: 0.24 },
  pulse: { wave: "sine", frequency: 160, frequencyEnd: 720, duration: 0.3, gain: 0.2 },
  goal: { wave: "sine", frequency: 523.25, frequencyEnd: 783.99, duration: 0.42, gain: 0.16 },
  uiClick: { wave: "square", frequency: 410, frequencyEnd: 330, duration: 0.035, gain: 0.05 },
};

export class AudioFx {
  private context: AudioContext | null = null;

  play(name: AudioFxName, intensity = 1): void {
    this.context ??= new AudioContext();
    const context = this.context;
    if (context.state === "suspended") {
      void context.resume();
    }

    const preset = sounds[name];
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = preset.wave;
    oscillator.frequency.setValueAtTime(preset.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, preset.frequencyEnd),
      now + preset.duration,
    );
    gain.gain.setValueAtTime(
      Math.max(0.0001, preset.gain * intensity),
      now,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.duration);
  }

  dispose(): void {
    if (this.context) {
      void this.context.close();
    }
    this.context = null;
  }
}

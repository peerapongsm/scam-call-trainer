/**
 * Thin adapter around speechSynthesis (SPEC §7). Game code never touches the
 * browser API directly — everything is injected so it can be unit-tested.
 */

export interface UtteranceLike {
  text: string;
  lang?: string;
  voice?: VoiceLike | null;
  rate?: number;
}

export interface VoiceLike {
  lang: string;
  name: string;
}

export interface SynthLike {
  getVoices(): VoiceLike[];
  speak(utterance: UtteranceLike): void;
  cancel(): void;
}

export interface TtsAdapter {
  supported: boolean;
  speak(text: string): void;
  cancel(): void;
}

export function pickThaiVoice(voices: VoiceLike[]): VoiceLike | undefined {
  return voices.find((v) => v.lang.toLowerCase().replace("_", "-").startsWith("th"));
}

export function createTts(
  synth: SynthLike | undefined,
  makeUtterance: (text: string) => UtteranceLike = (text) => ({ text }),
): TtsAdapter {
  const voice = synth ? pickThaiVoice(synth.getVoices()) : undefined;
  if (!synth || !voice) {
    return { supported: false, speak: () => {}, cancel: () => {} };
  }
  return {
    supported: true,
    speak(text: string) {
      const u = makeUtterance(text);
      u.lang = "th-TH";
      u.voice = voice;
      u.rate = 1.05;
      synth.speak(u);
    },
    cancel() {
      synth.cancel();
    },
  };
}

const PREF_KEY = "scam-call-trainer:tts";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Default ON where supported (SPEC §7). */
export function loadTtsPref(storage: StorageLike): boolean {
  return storage.getItem(PREF_KEY) !== "off";
}

export function saveTtsPref(storage: StorageLike, on: boolean): void {
  storage.setItem(PREF_KEY, on ? "on" : "off");
}

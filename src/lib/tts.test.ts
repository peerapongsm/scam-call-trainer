import { describe, expect, it, vi } from "vitest";
import {
  createTts,
  loadTtsPref,
  pickThaiVoice,
  saveTtsPref,
  type SynthLike,
  type UtteranceLike,
  type VoiceLike,
} from "./tts";

function fakeSynth(voices: VoiceLike[]): SynthLike & {
  spoken: UtteranceLike[];
  cancelled: number;
} {
  const spoken: UtteranceLike[] = [];
  return {
    spoken,
    cancelled: 0,
    getVoices: () => voices,
    speak(u) {
      spoken.push(u);
    },
    cancel() {
      this.cancelled += 1;
    },
  };
}

const THAI: VoiceLike = { lang: "th-TH", name: "Kanya" };
const EN: VoiceLike = { lang: "en-US", name: "Alex" };

describe("createTts", () => {
  it("reports unsupported when speechSynthesis is missing", () => {
    expect(createTts(undefined).supported).toBe(false);
  });

  it("reports unsupported when no Thai voice exists", () => {
    const synth = fakeSynth([EN]);
    const tts = createTts(synth);
    expect(tts.supported).toBe(false);
    tts.speak("ครับ"); // must be a safe no-op
    expect(synth.spoken).toHaveLength(0);
  });

  it("speaks with the Thai voice when available", () => {
    const synth = fakeSynth([EN, THAI]);
    const tts = createTts(synth);
    expect(tts.supported).toBe(true);
    tts.speak("สวัสดีครับ");
    expect(synth.spoken).toHaveLength(1);
    expect(synth.spoken[0].voice).toBe(THAI);
    expect(synth.spoken[0].lang).toBe("th-TH");
  });

  it("cancel stops playback (used on hang-up)", () => {
    const synth = fakeSynth([THAI]);
    const tts = createTts(synth);
    tts.cancel();
    expect(synth.cancelled).toBe(1);
  });

  it("matches th_TH-style underscore locales too", () => {
    expect(pickThaiVoice([{ lang: "th_TH", name: "X" }])).toBeTruthy();
  });
});

describe("tts preference", () => {
  function fakeStorage(): Storage {
    const map = new Map<string, string>();
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    } as Storage;
  }

  it("defaults ON and persists the toggle", () => {
    const storage = fakeStorage();
    expect(loadTtsPref(storage)).toBe(true);
    saveTtsPref(storage, false);
    expect(loadTtsPref(storage)).toBe(false);
    saveTtsPref(storage, true);
    expect(loadTtsPref(storage)).toBe(true);
  });
});

let currentUtterance: SpeechSynthesisUtterance | null = null;

// Return a promise that resolves with the list of SpeechSynthesis voices
export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    
    // Voices load asynchronously
    const voicesChangedHandler = () => {
      voices = window.speechSynthesis.getVoices();
      resolve(voices);
      window.speechSynthesis.onvoiceschanged = null;
    };
    
    window.speechSynthesis.onvoiceschanged = voicesChangedHandler;
    
    // Timeout fallback (some platforms do not fire the event)
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
};

export const speakText = async (
  text: string,
  settings: { ttsVoice: string; ttsVolume: number; ttsSpeed: number },
  escalationLevel: number = 1
): Promise<void> => {
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const voices = await getAvailableVoices();
  const voice = voices.find((v) => v.name === settings.ttsVoice) || null;

  // Enhance text or pitch based on strict escalation level
  let processedText = text;
  let rate = settings.ttsSpeed;
  let pitch = 1.0;
  let volume = settings.ttsVolume;

  if (escalationLevel === 2) {
    processedText = `Attention: ${text}`;
    pitch = 1.1;
    rate = rate * 1.1;
  } else if (escalationLevel === 3) {
    processedText = `Warning! Sai! ${text}`;
    pitch = 1.25;
    rate = rate * 1.2;
    volume = Math.min(1.0, volume * 1.2);
  } else if (escalationLevel >= 4) {
    processedText = `CRITICAL FOCUS ENFORCEMENT! Sai, you must stop procrastinating immediately! ${text}`;
    pitch = 1.4;
    rate = rate * 1.3;
    volume = 1.0;
  }

  currentUtterance = new SpeechSynthesisUtterance(processedText);
  if (voice) {
    currentUtterance.voice = voice;
  }
  
  currentUtterance.volume = volume;
  currentUtterance.rate = Math.min(2.0, Math.max(0.5, rate));
  currentUtterance.pitch = Math.min(2.0, Math.max(0.5, pitch));

  window.speechSynthesis.speak(currentUtterance);
};

export const stopSpeaking = (): void => {
  window.speechSynthesis.cancel();
  currentUtterance = null;
};

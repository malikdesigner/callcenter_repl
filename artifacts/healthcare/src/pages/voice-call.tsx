import { useEffect, useRef, useState, useCallback } from "react";
import { Layout } from "@/components/layout";
import { Phone, PhoneOff, Mic, MicOff, Volume2, Activity, Loader2 } from "lucide-react";

type CallState = "idle" | "connecting" | "connected" | "speaking" | "processing" | "responding";
type Message = { role: "user" | "assistant"; text: string; time: string };

function getWsUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/voice/ws`;
}

function useVoiceWs(onMessage: (msg: unknown) => void, onAudio: (data: ArrayBuffer) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return wsRef.current;
    const ws = new WebSocket(getWsUrl());
    ws.binaryType = "arraybuffer";
    ws.onmessage = (e) => {
      if (typeof e.data === "string") {
        try { onMessage(JSON.parse(e.data)); } catch {}
      } else {
        onAudio(e.data as ArrayBuffer);
      }
    };
    wsRef.current = ws;
    return ws;
  }, [onMessage, onAudio]);

  const send = useCallback((data: string | Blob | ArrayBuffer) => {
    wsRef.current?.send(data);
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => () => wsRef.current?.close(), []);
  return { connect, send, disconnect, wsRef };
}

export default function VoiceCallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleServerMsg = useCallback((msg: unknown) => {
    const m = msg as Record<string, string>;
    if (m.type === "status") {
      setStatusMsg(m.message);
    } else if (m.type === "transcript") {
      setMessages((prev) => [...prev, { role: "user", text: m.text, time: new Date().toLocaleTimeString("ur-PK") }]);
      setStatusMsg("");
    } else if (m.type === "response_text") {
      setMessages((prev) => [...prev, { role: "assistant", text: m.text, time: new Date().toLocaleTimeString("ur-PK") }]);
      setCallState("responding");
    } else if (m.type === "done") {
      setCallState("connected");
      setStatusMsg("");
    } else if (m.type === "error") {
      setStatusMsg(m.message);
      setCallState("connected");
    }
  }, []);

  const handleAudio = useCallback((data: ArrayBuffer) => {
    try {
      const blob = new Blob([data], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(console.error);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  }, []);

  const { connect, send, disconnect } = useVoiceWs(handleServerMsg, handleAudio);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startCall = async () => {
    try {
      setCallState("connecting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio level monitoring
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const ws = connect();
      ws.onopen = () => {
        setCallState("connected");
        setStatusMsg("کال جڑ گئی — بولنے کے لیے مائیک بٹن دبائیں");
        callTimerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
      };
      ws.onerror = () => {
        setStatusMsg("کنکشن میں مسئلہ ہے");
        setCallState("idle");
      };
      ws.onclose = () => {
        if (callState !== "idle") endCall();
      };
    } catch (e) {
      setCallState("idle");
      setStatusMsg("مائیک تک رسائی نہیں ملی");
    }
  };

  const endCall = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    disconnect();
    setCallState("idle");
    setCallDuration(0);
    setIsRecording(false);
    setAudioLevel(0);
    setStatusMsg("");
  };

  const startRecording = () => {
    if (!streamRef.current || isRecording) return;
    audioChunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "audio/webm;codecs=opus" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    mr.start(100);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setCallState("speaking");
    setStatusMsg("بول رہے ہیں...");

    // Animate audio level
    const tick = () => {
      if (analyserRef.current) {
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setAudioLevel(avg / 128);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);

    await new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = () => resolve();
      mediaRecorderRef.current!.stop();
    });

    setIsRecording(false);
    setCallState("processing");
    setStatusMsg("آواز بھیج رہے ہیں...");

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const arrayBuf = await audioBlob.arrayBuffer();
    send(arrayBuf);
    send(JSON.stringify({ type: "end_recording" }));
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const waveCount = 8;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">وائس کال اسسٹنٹ</h1>
            <p className="text-xs text-muted-foreground">اردو میں بات کریں — ہسپتال کے بارے میں سوال پوچھیں</p>
          </div>
          {callState !== "idle" && (
            <div className="ml-auto flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-mono text-green-600">{formatDuration(callDuration)}</span>
            </div>
          )}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col items-center justify-between p-6 overflow-y-auto">

          {/* Visual indicator */}
          <div className="flex flex-col items-center gap-6 w-full max-w-lg">
            {/* Avatar / wave animation */}
            <div className="relative flex items-center justify-center">
              {/* Ripple rings when active */}
              {callState !== "idle" && (
                <>
                  <div className={`absolute rounded-full border-2 ${callState === "speaking" ? "border-red-400" : "border-primary"} opacity-20 animate-ping`}
                    style={{ width: 180, height: 180 }} />
                  <div className={`absolute rounded-full border ${callState === "speaking" ? "border-red-300" : "border-primary"} opacity-10 animate-ping`}
                    style={{ width: 220, height: 220, animationDelay: "0.15s" }} />
                </>
              )}
              <div className={`relative w-36 h-36 rounded-full flex items-center justify-center shadow-lg transition-all duration-300
                ${callState === "idle" ? "bg-muted" : callState === "speaking" ? "bg-red-500" : callState === "responding" ? "bg-green-500" : "bg-primary"}`}>
                {callState === "idle" ? (
                  <Phone className="h-14 w-14 text-muted-foreground" />
                ) : callState === "processing" ? (
                  <Loader2 className="h-14 w-14 text-white animate-spin" />
                ) : callState === "speaking" ? (
                  <Mic className="h-14 w-14 text-white" />
                ) : callState === "responding" ? (
                  <Volume2 className="h-14 w-14 text-white" />
                ) : (
                  <Activity className="h-14 w-14 text-white" />
                )}
              </div>
            </div>

            {/* Audio waveform (when recording) */}
            {isRecording && (
              <div className="flex items-end gap-1 h-10">
                {Array.from({ length: waveCount }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-full bg-red-500 transition-all duration-75"
                    style={{
                      height: `${Math.max(8, audioLevel * 40 * (0.5 + 0.5 * Math.sin(Date.now() / 200 + i)))}px`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Status */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground min-h-5 font-medium" dir="rtl">
                {callState === "idle" ? "کال شروع کریں" : statusMsg || (callState === "connected" ? "تیار ہیں" : "")}
              </p>
            </div>

            {/* Call controls */}
            <div className="flex items-center gap-6">
              {callState === "idle" ? (
                <button
                  onClick={startCall}
                  className="flex flex-col items-center gap-2 p-5 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all active:scale-95"
                  data-testid="button-start-call"
                >
                  <Phone className="h-8 w-8" />
                </button>
              ) : (
                <>
                  {/* Push-to-talk mic button */}
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                    disabled={callState === "processing" || callState === "responding"}
                    className={`flex flex-col items-center gap-2 p-5 rounded-full shadow-lg transition-all select-none
                      ${isRecording
                        ? "bg-red-500 hover:bg-red-600 scale-110"
                        : "bg-primary hover:bg-primary/90"}
                      text-white disabled:opacity-40 disabled:cursor-not-allowed`}
                    data-testid="button-mic"
                  >
                    {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                  </button>

                  {/* End call */}
                  <button
                    onClick={endCall}
                    className="flex flex-col items-center gap-2 p-5 bg-destructive hover:bg-destructive/90 text-white rounded-full shadow-lg transition-all active:scale-95"
                    data-testid="button-end-call"
                  >
                    <PhoneOff className="h-8 w-8" />
                  </button>
                </>
              )}
            </div>

            {callState !== "idle" && (
              <p className="text-xs text-muted-foreground text-center" dir="rtl">
                مائیک بٹن دبائے رکھیں اور اردو میں بولیں — چھوڑیں تو جواب آئے گا
              </p>
            )}
          </div>

          {/* Transcript */}
          {messages.length > 0 && (
            <div className="w-full max-w-lg mt-6 space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide" dir="rtl">گفتگو</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] leading-relaxed text-right
                        ${msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"}`}
                      dir="rtl"
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

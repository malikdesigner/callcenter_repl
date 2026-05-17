import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { execFile, spawn } from "child_process";
import { unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { promisify } from "util";
import { logger } from "../lib/logger";

const execFileAsync = promisify(execFile);

const SCRIPTS_DIR = resolve(process.cwd(), "artifacts/voice-agent/scripts");
const OLLAMA_URL = process.env["OLLAMA_URL"] ?? "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env["OLLAMA_MODEL"] ?? "phi3";
const TTS_VOICE = process.env["TTS_VOICE"] ?? "ur-PK-UzmaNeural";

const HOSPITAL_CONTEXT = `
=== جنرل ہسپتال — مکمل معلومات ===
نام: جنرل ہسپتال (General Hospital)
پتہ: 123 میڈیکل سینٹر ڈرائیو، ہیلتھ کیئر سٹی
فون: +1 (555) 100-0000 | ای میل: info@generalhospital.com

اوقات: پیر-جمعہ 8:00-18:00 | ہفتہ 9:00-14:00 | اتوار بند | ایمرجنسی 24/7

ڈاکٹرز:
- ڈاکٹر سارہ چن: کارڈیالوجی (دل) | پیر-جمعہ 9-17 | +1(555)201-0001
- ڈاکٹر مارکس جانسن: نیورالوجی (اعصاب) | پیر-جمعہ 8-16 | +1(555)201-0002
- ڈاکٹر ایملی روڈریگز: بچوں کی بیماریاں | پیر-جمعہ 9-18 | +1(555)201-0003
- ڈاکٹر جیمز پارک: آرتھوپیڈکس (ہڈیاں/جوڑ) | پیر-جمعرات 10-18 | +1(555)201-0004
- ڈاکٹر عائشہ پٹیل: اندرونی طب، ذیابیطس | پیر-جمعہ 8:30-16:30 | +1(555)201-0005

اپائنٹمنٹ: فون +1(555)100-0000 یا www.mediflow.com
ایمرجنسی: 911 یا +1(555)100-0911
`;

const SYSTEM_PROMPT = `آپ جنرل ہسپتال کے ذہین AI وائس اسسٹنٹ ہیں۔ ہمیشہ اردو میں مختصر اور واضح جواب دیں (2-3 جملے)۔
${HOSPITAL_CONTEXT}`;

type ConversationEntry = { user: string; assistant: string };

function sendJson(ws: WebSocket, obj: object): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

async function convertToWav(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y", "-i", inputPath, "-ar", "16000", "-ac", "1", "-f", "wav", outputPath,
  ]);
}

async function transcribeAudio(wavPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("python3", [
      join(SCRIPTS_DIR, "transcribe.py"), wavPath,
    ], { timeout: 60_000, maxBuffer: 1024 * 1024 });
    return stdout.trim();
  } catch (err) {
    logger.error({ err }, "Transcription failed");
    return "";
  }
}

async function getLlmResponse(userText: string, history: ConversationEntry[]): Promise<string> {
  const historyText = history
    .slice(-6)
    .map((h) => `انسان: ${h.user}\nاسسٹنٹ: ${h.assistant}`)
    .join("\n\n");

  const prompt = `${SYSTEM_PROMPT}\n\n${historyText}\nانسان: ${userText}\nاسسٹنٹ:`;

  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 150 },
      }),
      signal: AbortSignal.timeout(35_000),
    });
    if (res.ok) {
      const data = await res.json() as { response?: string };
      const text = data.response?.trim() ?? "";
      if (text) return text;
    }
  } catch {
    logger.warn("Ollama unavailable, using rule-based fallback");
  }

  return getFallbackResponse(userText);
}

function getFallbackResponse(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("اپائنٹمنٹ") || m.includes("appointment") || m.includes("ملنا"))
    return "اپائنٹمنٹ کے لیے +1 (555) 100-0000 پر کال کریں یا www.mediflow.com پر آن لائن بک کریں۔";
  if (m.includes("وقت") || m.includes("time") || m.includes("hours") || m.includes("اوقات"))
    return "ہسپتال پیر سے جمعہ صبح 8 سے شام 6 بجے کھلا ہے۔ ایمرجنسی 24 گھنٹے دستیاب ہے۔";
  if (m.includes("ڈاکٹر") || m.includes("doctor"))
    return "ہمارے پاس دل، اعصاب، بچوں، ہڈیوں، اور اندرونی طب کے ماہر ڈاکٹر ہیں۔ کس کے بارے میں جاننا ہے؟";
  if (m.includes("ایمرجنسی") || m.includes("emergency"))
    return "ایمرجنسی کے لیے 911 یا +1 (555) 100-0911 پر فوری رابطہ کریں۔";
  if (m.includes("دل") || m.includes("heart"))
    return "دل کی بیماریوں کے لیے ڈاکٹر سارہ چن دستیاب ہیں۔ رابطہ: +1 (555) 201-0001";
  if (m.includes("بچہ") || m.includes("children") || m.includes("بچے"))
    return "بچوں کے لیے ڈاکٹر ایملی روڈریگز ماہر ہیں۔ پیر تا جمعہ صبح 9 سے شام 6 بجے۔";
  if (m.includes("ہڈی") || m.includes("جوڑ") || m.includes("گھٹنا"))
    return "ہڈیوں اور جوڑوں کے لیے ڈاکٹر جیمز پارک سے ملیں: +1 (555) 201-0004";
  if (m.includes("ذیابیطس") || m.includes("شوگر") || m.includes("بلڈ پریشر"))
    return "ذیابیطس اور بلڈ پریشر کے لیے ڈاکٹر عائشہ پٹیل: +1 (555) 201-0005";
  if (m.includes("سلام") || m.includes("hello") || m.includes("ہیلو"))
    return "السلام علیکم! میں جنرل ہسپتال کا AI اسسٹنٹ ہوں۔ آپ کی کیسے مدد کر سکتا ہوں؟";
  return "جنرل ہسپتال میں خوش آمدید۔ اپائنٹمنٹ، ڈاکٹرز، یا خدمات کے بارے میں پوچھیں۔";
}

function synthesizeSpeech(text: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const proc = spawn("python3", [join(SCRIPTS_DIR, "tts.py"), text, TTS_VOICE]);
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", (d: Buffer) => logger.warn({ msg: d.toString() }, "TTS stderr"));
    proc.on("close", (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        resolve(null);
      }
    });
    proc.on("error", (err) => {
      logger.error({ err }, "TTS spawn error");
      resolve(null);
    });
    setTimeout(() => { proc.kill(); resolve(null); }, 30_000);
  });
}

async function handleVoiceSession(ws: WebSocket): Promise<void> {
  const audioChunks: Buffer[] = [];
  const history: ConversationEntry[] = [];

  ws.on("message", async (data: WebSocket.RawData) => {
    if (Buffer.isBuffer(data)) {
      audioChunks.push(data);
      return;
    }

    const rawStr = data instanceof ArrayBuffer
      ? Buffer.from(data).toString("utf8")
      : Array.isArray(data)
      ? Buffer.concat(data).toString("utf8")
      : String(data);

    let msg: { type: string };
    try {
      msg = JSON.parse(rawStr) as { type: string };
    } catch {
      return;
    }

    if (msg.type === "ping") {
      sendJson(ws, { type: "pong" });
      return;
    }

    if (msg.type === "clear_history") {
      history.length = 0;
      sendJson(ws, { type: "history_cleared" });
      return;
    }

    if (msg.type !== "end_recording") return;

    if (audioChunks.length === 0) {
      sendJson(ws, { type: "error", message: "کوئی آواز نہیں ملی۔ دوبارہ کوشش کریں۔" });
      return;
    }

    const audioBuf = Buffer.concat(audioChunks);
    audioChunks.length = 0;

    const tmpIn = join(tmpdir(), `voice_in_${Date.now()}.webm`);
    const tmpWav = join(tmpdir(), `voice_wav_${Date.now()}.wav`);

    try {
      sendJson(ws, { type: "status", message: "آواز پر کارروائی ہو رہی ہے..." });
      await writeFile(tmpIn, audioBuf);
      await convertToWav(tmpIn, tmpWav);

      sendJson(ws, { type: "status", message: "سن رہا ہوں..." });
      const transcript = await transcribeAudio(tmpWav);

      if (!transcript) {
        sendJson(ws, { type: "error", message: "آواز واضح نہیں تھی۔ دوبارہ بولیں۔" });
        return;
      }

      sendJson(ws, { type: "transcript", text: transcript });
      logger.info({ transcript }, "Urdu transcription");

      sendJson(ws, { type: "status", message: "جواب تیار ہو رہا ہے..." });
      const responseText = await getLlmResponse(transcript, history);
      history.push({ user: transcript, assistant: responseText });
      if (history.length > 10) history.splice(0, history.length - 10);

      sendJson(ws, { type: "response_text", text: responseText });

      sendJson(ws, { type: "status", message: "بول رہا ہوں..." });
      const audioResponse = await synthesizeSpeech(responseText);
      if (audioResponse && ws.readyState === WebSocket.OPEN) {
        ws.send(audioResponse);
      }

      sendJson(ws, { type: "done" });
    } catch (err) {
      logger.error({ err }, "Voice pipeline error");
      sendJson(ws, { type: "error", message: "ایک خرابی پیش آئی۔ دوبارہ کوشش کریں۔" });
    } finally {
      await unlink(tmpIn).catch(() => {});
      await unlink(tmpWav).catch(() => {});
    }
  });

  ws.on("error", (err) => logger.error({ err }, "Voice WebSocket error"));
}

export function setupVoiceWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (req.url === "/api/voice/ws") {
      wss.handleUpgrade(req, socket as import("net").Socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    }
  });

  wss.on("connection", (ws) => {
    logger.info("Voice WebSocket client connected");
    handleVoiceSession(ws).catch((err) => logger.error({ err }, "Voice session error"));
  });

  logger.info("Voice WebSocket server ready at /api/voice/ws");
}

import { isRecord } from "./shared";

export type ModelFailureKind = "provider error" | "permission missing" | "timeout" | "empty reply" | "invalid output" | "invalid JSON" | "stopped";

export class ModelCallError extends Error {
  constructor(readonly category: ModelFailureKind, message: string) {
    super(message);
  }
}

const statusMessages: Record<number, string> = {
  400: "Request rejected. Check the connection settings.",
  401: "The API key is missing or wrong.",
  402: "The connection is out of credits or has a billing problem.",
  403: "Access forbidden. The key may lack access to this model, or the provider blocked the request.",
  404: "Model not found. Check the model in the connection settings.",
  408: "The request timed out. Try again.",
  429: "Rate-limited by the provider. Wait, then try again.",
  500: "The provider has a problem. Try again later.",
  502: "The provider has a problem. Try again later.",
  503: "The provider has a problem. Try again later.",
  504: "The request timed out. Try again.",
};

// Keep only the message from a JSON error body. Never forward a response dump or
// private headers. If a free-text detail contains a credential disclosure, omit it.
export function safeModelMessage(input: string): string {
  let message = input.trim();
  if (!message || message.length > 4000) return "";
  const jsonStart = message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body: unknown = JSON.parse(message.slice(jsonStart));
      if (!isRecord(body)) return "";
      const detail = isRecord(body.error) ? body.error.message : body.message ?? body.error;
      if (typeof detail !== "string" || detail.includes("{")) return "";
      message = message.slice(0, jsonStart) + detail;
    } catch { return ""; }
  }
  if (/\b(?:authorization|proxy[-_ ]authorization|cookie|set[-_ ]cookie|headers?|x-[\w-]+)\s*["']?\s*[:=]/i.test(message) ||
      /\b(?:bearer|basic)\s+\S{4,}/i.test(message) ||
      /\b(?:api[-_ ]?key|access[-_ ]?token|secret|password|credential)(?:\s+(?:provided|value))?\s*["']?\s*[:=]/i.test(message) ||
      /\b(?:key|token|secret|password|credential)\s+(?:["'`]|(?:is|was)\s+["'`])/i.test(message) ||
      /\b(?:sk[-_]|AIza|gh[pousr]_)[\w-]{5,}/.test(message) ||
      /[a-z\d_+/=-]{24,}/i.test(message) || /https?:\/\/\S+/i.test(message) ||
      /[\r\n\u0000-\u001f\u007f]|<[^>]*>/.test(message)) return "";
  return message.slice(0, 600);
}

function statusIn(text: string): number | undefined {
  const explicit = /(?:\b(?:http(?:\/\d(?:\.\d)?)?|status(?:[-_ ]*code)?|error(?:\s+code)?|code|failed(?:\s+with)?)\s*["':= (]*|^\s*|\()(4\d\d|5\d\d)(?=\D|$)/i.exec(text);
  if (explicit) return Number(explicit[1]);
  const phrases: [number, RegExp][] = [
    [429, /rate[-_ ]?limit|too many requests|resource[_ ]exhausted/i],
    [402, /out of credits|insufficient[_ ](?:credits|quota)|billing/i],
    [401, /unauthori[sz]ed|invalid[_ ]api[_ ]key|incorrect api key|no api key|api key.*(?:missing|wrong|invalid|none could be read)/i],
    [403, /forbidden|model access denied/i],
    [404, /model[_ ]not[_ ]found|model.*does not exist/i],
    [400, /bad request|invalid_request_error/i],
    [503, /service unavailable|provider overloaded/i],
    [502, /bad gateway/i],
    [500, /internal server error/i],
  ];
  return phrases.find(([, pattern]) => pattern.test(text))?.[0];
}

export function modelRequestError(error: unknown): ModelCallError {
  if (error instanceof ModelCallError) return error;
  const raw = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  const status = statusIn(raw);
  const detail = safeModelMessage(raw);
  if (status && statusMessages[status]) {
    const category = status === 408 || status === 504 ? "timeout" : "provider error";
    return new ModelCallError(category, [statusMessages[status], detail].filter(Boolean).join(" "));
  }
  if (/generation permission not granted|permission denied.*generation|userId is required/i.test(raw)) {
    return new ModelCallError("permission missing", "Allow generation access in Lumiverse Extensions.");
  }
  if ((error instanceof Error && error.name === "TimeoutError") || /timed?\s*out|timeout/i.test(raw)) {
    return new ModelCallError("timeout", ["The request timed out. Try again.", detail].filter(Boolean).join(" "));
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new ModelCallError("stopped", "The model request was stopped.");
  }
  if (/failed to fetch|fetch failed|network|connection refused|econnreset|econnrefused|enotfound|eai_again|unable to connect|failed to connect|connection reset|socket hang up/i.test(raw)) {
    return new ModelCallError("provider error", ["No reply from the provider. Check the internet connection or server address.", detail].filter(Boolean).join(" "));
  }
  return new ModelCallError("provider error", detail || "The provider request failed. Check the connection settings.");
}

export function readModelReply(response: unknown): string {
  if (!isRecord(response)) throw new ModelCallError("invalid output", "The provider returned an unsupported reply.");
  const finish = typeof response.finish_reason === "string" ? response.finish_reason.trim() : "";
  const reason = finish.toLowerCase();
  if (["content_filter", "safety", "blocked", "recitation"].includes(reason)) {
    throw new ModelCallError("stopped", "The provider's content filter blocked this reply. Try again or use another connection.");
  }
  if (["length", "max_tokens", "max_output_tokens"].includes(reason)) {
    throw new ModelCallError("stopped", "The reply was cut off. Try fewer fields at once.");
  }
  if (!["stop", "end_turn", "stop_sequence", "completed"].includes(reason) || (Array.isArray(response.tool_calls) && response.tool_calls.length)) {
    const safeReason = /^[a-z][a-z0-9_-]{0,35}$/i.test(finish) ? safeModelMessage(finish) : "";
    throw new ModelCallError("stopped", safeReason ? `The reply stopped early (${safeReason}).` : "The provider did not confirm the reply finished.");
  }
  if (response.content === undefined || response.content === null || (typeof response.content === "string" && !response.content.trim())) {
    throw new ModelCallError("empty reply", "The provider returned an empty reply.");
  }
  if (typeof response.content !== "string") throw new ModelCallError("invalid output", "The provider returned an unsupported reply.");
  return response.content;
}

/** Lumiverse rejects a failed request before returning its documented reply DTO. */
export async function checkedModelReply(request: () => Promise<unknown>): Promise<string> {
  let response: unknown;
  try { response = await request(); }
  catch (error) { throw modelRequestError(error); }
  return readModelReply(response);
}

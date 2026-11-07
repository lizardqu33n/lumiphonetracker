import { expect, test } from "bun:test";
import { checkedModelReply, modelRequestError, readModelReply, safeModelMessage } from "../src/model-errors";
import { SetupChoiceStore } from "../src/setup-choices";

for (const [status, phrase] of [
  [400, "Request rejected"], [401, "key is missing or wrong"], [402, "out of credits"],
  [403, "Access forbidden"], [404, "Model not found"], [408, "timed out"],
  [429, "Rate-limited"], [500, "provider has a problem"], [502, "provider has a problem"],
  [503, "provider has a problem"], [504, "timed out"],
] as const) {
  test(`worker error text for HTTP ${status} keeps safe upstream detail`, async () => {
    const message = `Example generate failed (${status}): Upstream explanation`;
    await expect(checkedModelReply(async () => { throw Error(message); })).rejects.toThrow(phrase);
    expect(modelRequestError(Error(message)).message).toContain("Upstream explanation");
  });
}

test("429 can be recovered from a status phrase and is not an invalid reply", () => {
  expect(modelRequestError(Error("Too many requests. Retry in a minute.")).message).toContain("Rate-limited");
  expect(modelRequestError(Error("HTTP 429: {bad upstream body")).message).not.toContain("invalid JSON");
  expect(modelRequestError(Error("fetch failed: ECONNREFUSED")).message).toContain("No reply from the provider");
  expect(modelRequestError(Error("A different upstream explanation.")).message).toBe("A different upstream explanation.");
});

test("only provider message text can leave the error body and credential echoes are withheld", () => {
  const body = JSON.stringify({error:{message:"Wait before retrying.",headers:{Authorization:"Bearer SECRET"},api_key:"PRIVATE"}});
  expect(modelRequestError(Error(`HTTP 429: ${body}`)).message).toContain("Wait before retrying.");
  expect(modelRequestError(Error(`HTTP 429: ${body}`)).message).not.toMatch(/SECRET|PRIVATE|Authorization/);
  for (const detail of [
    "Incorrect API key provided: SHORT_SECRET", "x-private-header: PRIVATE_VALUE", "Cookie: session=SECRET",
    "Provider included Bearer SECRET_TOKEN", "Wrong key 'PRIVATE'", "Visit https://example.test/?key=SECRET",
    "Key is sk-secretvalue", "Bad response\nSecret-Header: PRIVATE", "Headers: [secret]",
  ]) expect(safeModelMessage(detail)).toBe("");
});

test("finish reason is checked before content, even when a partial reply parses", () => {
  const content = '{"weather":"Sunny"}';
  expect(() => readModelReply({content,finish_reason:"content_filter"})).toThrow("content filter blocked");
  expect(() => readModelReply({content,finish_reason:"length"})).toThrow("cut off");
  expect(() => readModelReply({content,finish_reason:"tool_calls"})).toThrow("(tool_calls)");
  expect(() => readModelReply({content})).toThrow("did not confirm");
  expect(() => readModelReply({content:" ",finish_reason:"stop"})).toThrow("empty reply");
  expect(readModelReply({content,finish_reason:"end_turn"})).toBe(content);
});

test("wizard choices persist per user and chat and rapid writes keep the last choice", async () => {
  const saved = new Map<string, unknown>();
  const io = {
    authorize: async (u:string,c:string) => ["a","b"].includes(c) && ["u","v"].includes(u),
    read: async (u:string,c:string) => saved.get(`${u}/${c}`),
    write: async (u:string,c:string,choices:unknown) => { await Bun.sleep(1); saved.set(`${u}/${c}`, choices); },
  };
  const store = new SetupChoiceStore(io);
  await Promise.all([store.access("u","a",true,["contacts.phone"]),store.access("u","a",true,["notes.rules"])]);
  const restart = new SetupChoiceStore(io);
  expect(await restart.access("u","a",false)).toEqual(["notes.rules"]);
  expect(await restart.access("v","a",false)).toEqual([]);
  expect(await restart.access("u","b",false)).toEqual([]);
  await expect(restart.access("u","other",true,["locations"])).rejects.toThrow("Chat unavailable");
  await expect(restart.access("u","a",true,["scene.time"])).rejects.toThrow("Invalid setup choices");
});

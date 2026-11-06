import {contactMatch} from "./contact-info";
import { isRecord } from "./shared";
import { recordText, placeholder } from "./record-values";
import { normalize, type Document, type State, type Origin, type CallData, type BankData, type TransactionData, type EmailData, type ManualEdit, type Patch } from "./model";
import { transformTags } from "./tags";
import { callId } from "./calls";
import type { StoryRow } from "./engine";
export const CAPS = { calls: 30, emails: 30, bank: 3, transactions: 20 };
export function validateActivity(kind: "calls" | "bank" | "transactions", raw: unknown): CallData | BankData | TransactionData {
    if (!isRecord(raw))
        throw Error("Invalid record");
    const keys = kind === "calls" ? ["name", "direction", "time", "evidence", "source", "count"] : kind === "bank" ? ["name", "balance", "time", "evidence"] : ["description", "amount", "time"];
    if (Object.keys(raw).some(k => !keys.includes(k)))
        throw Error("Invalid record");
    const base: Record<string, string> = {};
    for (const key of keys)
        if (raw[key] !== undefined && key !== "count")
            base[key] = recordText(raw[key], key === "evidence" ? 800 : key === "description" ? 240 : 100, key === "description" ? 14 : undefined);
    if (kind === "calls") {
        if (!base.name || !["in", "out", "missed"].includes(base.direction))
            throw Error("Invalid call");
        if(raw.count !== undefined) {
            if(typeof raw.count !== "number" || !Number.isInteger(raw.count) || raw.count < 1 || raw.count > 20) throw Error("Invalid call count");
            if(raw.count !== 1) (base as Record<string, unknown>).count=raw.count;
        }
    }
    else if (kind === "bank") {
        if (!base.name || !base.balance || (base.balance.match(/[0-9][0-9,]*(?:\.[0-9]+)?/g)?.length !== 1))
            throw Error("Invalid balance");
    }
    else if (!base.description || !base.amount || (base.amount.match(/[0-9][0-9,]*(?:\.[0-9]+)?/g)?.length !== 1))
        throw Error("Invalid transaction");
    return base as unknown as CallData | BankData | TransactionData;
}
export function parseActivityLine(key: string, raw: string): Record<string, unknown> {
    let evidence: string | undefined, source: string | undefined;
    const suffix = raw.indexOf(" ~ ");
    if (suffix >= 0) {
        const proof:unknown=JSON.parse(raw.slice(suffix+3));raw=raw.slice(0,suffix);
        if(typeof proof === "string")evidence=proof;
        else if(key==="call" && isRecord(proof) && Object.keys(proof).length===2 && typeof proof.source==="string" && typeof proof.quote==="string") { source=proof.source;evidence=proof.quote; }
        else throw Error("Invalid evidence");
    }
    const p=raw.split(" | ");
    const kind=key==="call"?"calls":key==="tx"?"transactions":"bank";
    if(p.length<2 || p.length>(kind==="calls"?4:3))throw Error("Invalid record");
    let count:number|undefined;
    if(kind==="calls" && (p.length===4 || /^x/i.test(p[2]??""))) {
        const token=p.pop()!;
        if(!/^x(?:[1-9]|1[0-9]|20)$/.test(token))throw Error("Invalid call count");
        count=Number(token.slice(1));
    }
    const data=kind==="calls"?{name:p[0],direction:p[1]}:kind==="bank"?{name:p[0],balance:p[1]}:{description:p[0],amount:p[1]};
    return {[kind]:[validateActivity(kind,{...data,...(p[2]!==undefined?{time:p[2]}:{}),...(count!==undefined?{count}:{}),...(source?{source}:{}),...(evidence?{evidence}:{})})]};
}

export function validateEmail(raw: unknown): EmailData {
    if (!isRecord(raw) || Object.keys(raw).some(k => !["from", "to", "subject", "body", "time"].includes(k)))
        throw Error("Invalid email");
    if (typeof raw.subject !== "string" || !raw.subject.trim() || raw.subject.length > 200 || /[\r\n\u0000]/.test(raw.subject) || placeholder(raw.subject))
        throw Error("Invalid subject");
    const out: EmailData = { from: recordText(raw.from), subject: raw.subject.trim(), body: typeof raw.body === "string" ? raw.body : "" };
    if (!out.body.trim() || out.body.length > 1500 || out.body.includes("\u0000"))
        throw Error("Invalid email body");
    out.body = out.body.trim();
    if (raw.to !== undefined)
        out.to = recordText(raw.to);
    if (raw.time !== undefined)
        out.time = recordText(raw.time);
    return out;
}
export const activityReceipt = (entry: unknown) => isRecord(entry) && ["in","out","missed"].includes(String(entry.direction))
    ? JSON.stringify([entry.id,entry.name,entry.direction,entry.time??null,entry.count??1]) : JSON.stringify(entry);
export const activityUnread = (entry: {
    id: string; legacyIds?:string[];name?:string;direction?:string;time?:string;count?:number;
}, seen: Record<string, string>) => {
    if(seen[entry.id]===activityReceipt(entry))return false;
    // Older receipts included the whole record. Accept them only for a verified legacy ID and identical displayed values.
    if(isRecord(entry) && Array.isArray(entry.legacyIds))for(const id of entry.legacyIds) {
        if(typeof id!=="string" || !seen[id])continue;
        try { const old:unknown=JSON.parse(seen[id]);if(isRecord(old)&&old.name===entry.name&&old.direction===entry.direction&&old.time===entry.time&&(old.count??1)===(entry.count??1))return false; }catch{}
    }
    return true;
};
const fingerprint = (v: unknown) => JSON.stringify(v, (_k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).filter(([k]) => !["id", "at", "by", "evidence", "source", "legacyIds"].includes(k)).sort(([a], [b]) => a.localeCompare(b))) : x);
function full(doc: Document, kind: keyof typeof CAPS, key: string): void { const text = `${kind === "bank" ? "Bank accounts" : kind === "transactions" ? "Transactions" : kind === "emails" ? "Email" : "Calls"} is full (${CAPS[kind]}/${CAPS[kind]}). Delete an entry to make room.`; if (!doc.state.notices.includes(text))
    doc.state.notices.push(text); if (!doc.rejected.includes(key))
    doc.rejected.push(key); }
export function userCallProof(call: CallData, rows: StoryRow[], players: Set<string>): boolean {
    if (!call.evidence)
        return false;
    return rows.some(row => {
        if (row.role !== "user" || !row.name || !players.has(normalize(row.name)))
            return false;
        const text = transformTags(row.content, "strip").trim();
        if (text !== call.evidence)
            return false;
        const n = normalize(text);
        if (/\b(?:not|never|no|if|would|might|plan|pretend|cancel|try)\b|n['’]t/.test(n))
            return false;
        const prefix = /^(?:i|my character) (?:call|called|dial|dialed|phone|phoned|ring|rang) /;
        let target=n.replace(prefix, "").replace(/[.!]$/, "");
        if((call.count??1)>1){const count=call.count!;const words=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];const tail=target.match(/ (\d+|[a-z]+) times$/);if(!tail || ![String(count),words[count]].includes(tail[1]))return false;target=target.slice(0,-tail[0].length);}
        return prefix.test(n) && target === normalize(call.name);
    });
}
export function applyActivities(doc: Document, patch: Patch, emails: EmailData[], at: Origin, rows: StoryRow[], players: Set<string>, user = false, tombstones = new Set<string>(), reservedCalls = new Set<string>()): void {
    const add = (kind: "calls" | "emails" | "transactions", value: unknown, ordinal: number) => {
        const list = doc.state[kind] as unknown as {
            id: string;
            at: Origin;
        }[];
        const legacyId=JSON.stringify([at.id,at.variant,kind,ordinal]);
        const id = kind==="calls"?callId(at.id,value as CallData):legacyId;
        const key = JSON.stringify(["activity", kind, id, value]);
        if (tombstones.has(`${kind}/${id}`) || (kind!=="calls" && tombstones.has(`${kind}/value/${fingerprint(value)}`)) || doc.rejected.includes(key))
            return;
        if (list.some(e => e.id === id || (kind!=="calls" && fingerprint(e) === fingerprint(value))))
            return;
        if (list.length + (kind==="calls"&&!reservedCalls.has(id)?[...reservedCalls].filter(key=>!list.some(e=>e.id===key)).length:0) >= CAPS[kind]) {
            full(doc, kind, key);
            return;
        }
        list.push({ ...value as object, id, at, ...(kind==="calls"?{legacyIds:[legacyId]}:{}), by: user ? "user" : "ai" } as never);
    };
    for (const [i, call] of (patch.calls ?? []).entries()) {
        if ((call.direction === "out" || players.has(normalize(contactMatch(doc,call.name)??call.name))) && !doc.settings.aiPlayerTexts && !user && !userCallProof(call, rows, players))
            continue;
        if (user && (!rows.at(-1)?.name || !players.has(normalize(rows.at(-1)!.name!))))
            continue;
        const {source:_source,...data}=call;
        add("calls", data, i);
    }
    for (const [i, email] of emails.entries()) {
        let direction: "incoming" | "outgoing" = "incoming";
        const fromPlayer = players.has(normalize(contactMatch(doc,email.from,"email")??email.from));
        if (user) {
            if (!rows.at(-1)?.name || normalize(contactMatch(doc,email.from,"email")??email.from) !== normalize(rows.at(-1)!.name!))
                continue;
            direction = "outgoing";
        }
        else {
            if (!players.size)
                continue;
            if (fromPlayer) {
                if (!doc.settings.aiPlayerTexts)
                    continue;
                direction = "outgoing";
            }
        }
        add("emails", { ...email, direction }, i);
    }
    for (const [i, tx] of (patch.transactions ?? []).entries())
        if (user || rows.some(r => transformTags(r.content, "strip").includes(tx.amount)))
            add("transactions", tx, i);
    for (const bank of patch.bank ?? []) {
        const old = doc.state.bank.find(b => normalize(b.name) === normalize(bank.name));
        if (tombstones.has(`bank/${normalize(bank.name)}`))
            continue;
        if (old?.balance === bank.balance && old.time === bank.time)
            continue;
        const proof = rows.filter(r => !old || r.index_in_chat > old.at.index).some(r => transformTags(r.content, "strip").includes(bank.balance) && normalize(transformTags(r.content, "strip")).includes(normalize(bank.name)));
        if (!user && !proof)
            continue;
        if (old?.by === "user" && !user && (!bank.evidence || !bank.evidence.includes(bank.balance) || !rows.some(r => r.index_in_chat > old.at.index && transformTags(r.content, "strip").includes(bank.evidence!))))
            continue;
        const key = JSON.stringify(["bank", at, bank]);
        if (doc.rejected.includes(key))
            continue;
        if (!old && doc.state.bank.length >= CAPS.bank) {
            full(doc, "bank", key);
            continue;
        }
        const entry = { ...bank, id: old?.id ?? JSON.stringify(["bank", normalize(bank.name)]), at, by: user ? "user" as const : "ai" as const };
        if (old)
            Object.assign(old, entry);
        else
            doc.state.bank.push(entry);
    }
}
export function applyActivityEdit(state: State, edit: ManualEdit, tombstones: Set<string>, players = new Set<string>(), allowPlayer = false): boolean {
    const kinds: Record<string, "calls" | "emails" | "bank" | "transactions"> = { call: "calls", email: "emails", bank: "bank", transaction: "transactions" };
    const kind = kinds[edit.target];
    if (!kind)
        return false;
    const list = state[kind] as unknown as Record<string, unknown>[];
    const id = edit.name ?? edit.id;
    const index = list.findIndex(e => e.id === id);
    const old = list[index];
    if (edit.remove) {
        if (old) {
            list.splice(index, 1);
            if(kind!=="calls")tombstones.add(`${kind}/value/${fingerprint(old)}`);
            tombstones.add(`${kind}/${kind === "bank" ? normalize(String(old.name)) : id}`);
        }
        return true;
    }
    const value = kind === "emails" ? validateEmail(edit.value) : validateActivity(kind, edit.value);
    if (!old && list.length >= CAPS[kind])
        throw Error("This app is full. Delete an entry to make room.");
    if (!allowPlayer && ((kind === "calls" && (value as CallData).direction === "out" && old?.direction !== "out") || (kind === "emails" && players.has(normalize((value as EmailData).from)) && (!old || old.direction !== "outgoing" || normalize(String(old.from)) !== normalize((value as EmailData).from)))))
        throw Error("Outgoing player entries need a sent player record or player-writing enabled.");
    if (kind === "bank" && list.some(e => e.id !== id && normalize(String(e.name)) === normalize((value as BankData).name)))
        throw Error("An account with that name already exists");
    if (old) {
        if(kind!=="calls")tombstones.add(`${kind}/value/${fingerprint(old)}`);
        if (kind === "bank" && normalize(String(old.name)) !== normalize((value as BankData).name))
            tombstones.add(`bank/${normalize(String(old.name))}`);
    }
    const entry = { ...value, id, ...(kind==="calls" && old?.legacyIds?{legacyIds:old.legacyIds}:{}), at: { id: edit.after ?? "manual", index: edit.index, variant: "manual" }, by: "user", ...(kind === "emails" ? { direction: players.has(normalize((value as EmailData).from)) ? "outgoing" : "incoming" } : {}) };
    if (old)
        list[index] = entry;
    else
        list.push(entry);
    tombstones.delete(`${kind}/${kind === "bank" ? normalize((value as BankData).name) : id}`);
    return true;
}

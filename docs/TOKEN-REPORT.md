# Part 1 token report

Compared with v0.6.4 using the SAME settings and tracked sample values. Main AI; defaults enabled (NPC thoughts off), no inference and no full sections. The populated sample contains location, time/date/weather, presence, one contact, another place and one note in each writable section. No messages are fabricated or inserted into the phone.

Character lengths count the full returned string, including whitespace. Rough tokens = character length / 4, rounded up: an English-text rule of thumb, NOT a tokenizer measurement. JSON punctuation, names, language and the chosen model can change actual token usage. The percentage column measures characters, not exact tokens.

| Example | Old characters | New characters | Old rough tokens | New rough tokens | Fewer characters |
| --- | ---: | ---: | ---: | ---: | ---: |
| phone_format, empty chat | 2,147 | 1,680 | about 537 | about 420 | 21.8% |
| phone_format, same populated tracker | 2,788 | 2,364 | about 697 | about 591 | 15.2% |
| Typical phone-state block | 815 | 552 | about 204 | about 138 | 32.3% |

The ordinary continuity data is preserved. Most block savings come from removing JSON object keys, quotes and wrappers. The new instructions also include stricter admission and length rules; those consume some of the syntax savings. An actual chat may differ substantially.

Full before/after output strings are in [TOKEN-SAMPLES.json](TOKEN-SAMPLES.json), so lengths can be recounted without a model connection. The baseline was captured before replacing formatMacro; it is not an estimate of what the old code might have emitted.

## Same sample block, before

```text
<phone-state>
location={"name":"North gate","wider":["Old town","Rookhaven"]}
time="12:10 AM"
date="Monday"
weather="Light rain"
present=["Ada","Player"]
contacts=[{"name":"Ada","roles":["guard","ally"],"physical":"Unhurt","mood":"Wary","position":"beside the gate","attire":{"worn":["blue wool coat","black boots"],"removed":[]}}]
locations=[{"name":"Station","description":"Closed brick station","relation":"West of the gate"}]
people=[{"name":"Ivo","detail":"Will guide them into the station","context":"Ada arranged a meeting"}]
items=[{"name":"Brass key","detail":"Unlocks the station vault","context":"Ada carries it"}]
rules=[{"name":"Quiet approach","detail":"Do not ring the bell","context":"Ada's warning"}]
plots=[{"name":"Meet Ivo","detail":"Meet Ivo at dawn","context":"Promise to Ada"}]
</phone-state>
```

## Same sample block, after

```text
<phone-state>
loc: North gate | Old town; Rookhaven
time: 12:10 AM
date: Monday
weather: Light rain
present: Ada; Player
c: Ada | roles=guard; ally | phys=Unhurt | mood=Wary | pos=beside the gate | worn=blue wool coat; black boots | off=
p: Station | Closed brick station | West of the gate
people: Ivo | Will guide them into the station | Ada arranged a meeting
items: Brass key | Unlocks the station vault | Ada carries it
rules: Quiet approach | Do not ring the bell | Ada's warning
plots: Meet Ivo | Meet Ivo at dawn | Promise to Ada
</phone-state>
```

The two blocks were parsed and checked for equivalent tracked values. The estimate does not claim a shorter block always improves model compliance; that needs live model testing.

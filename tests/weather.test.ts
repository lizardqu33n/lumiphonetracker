import { expect, test } from "bun:test";
import { defaults, emptyDocument } from "../src/model";
import { displayCondition, statedTemperature, temperatureParts, WEATHER_EXTRAS } from "../src/weather-fields";
import { parseExpanded } from "../src/schema";
import { replay, type StoryRow } from "../src/engine";
import { fieldKey } from "../src/field-protection";
import { readDocument } from "../src/phone-store";
import { helperValues } from "../src/helper";
import { formatMacro, renderMacro } from "../src/phone-macros";
import { presetSnapshot, validatePreset } from "../src/personal-settings";

const row=(index:number,prose:string,lines:string):StoryRow=>({id:`m${index}`,chat_id:"a",index_in_chat:index,swipe_id:0,role:"assistant",content:`${prose}<phone-state>\n${lines}\n</phone-state>`});

test("weather defaults and old profiles gain only the two default fields",()=>{
 const settings=defaults();expect(settings.enabled.weather).toBe(true);expect(settings.enabled["weather.temperature"]).toBe(true);
 expect(WEATHER_EXTRAS.every(key=>!settings.enabled[key])).toBe(true);
 const old=presetSnapshot(settings);for(const key of [...WEATHER_EXTRAS,"weather.temperature"])delete old.enabled[key];
 expect(validatePreset(old).enabled["weather.temperature"]).toBe(true);
});
test("condition validates the fixed list and leaves legacy text and edits intact",()=>{
 expect(parseExpanded("condition: clear night")?.weather?.value).toBe("clear night");
 expect(parseExpanded("condition: other | Dust haze")?.weather?.value).toBe("other | Dust haze");
 expect(parseExpanded("condition: tornado\nseason: Autumn")?.scene.season?.value).toBe("Autumn");
 expect(parseExpanded("weather=\"Unusual green rain\"\ncondition=\"cloudy\"\ndate=\"Monday\"")?.scene.date?.value).toBe("Monday");
 const legacy=row(0,"The mist remains.",'weather="  Green mist  "');
 const doc=replay(emptyDocument("a"),[legacy],[]);
 const saved=readDocument(JSON.stringify(doc),"a");
 expect(replay(saved,[legacy],[]).state.weather?.value).toBe("  Green mist  ");
 expect(displayCondition("  Green mist  ")).toEqual({kind:"other",label:"  Green mist  "});
});
test("temperature preserves the exact stated figure and unit, with no guessed figure",()=>{
 const rows=[row(0,"It is 18.5 degrees Celsius.","temperature: 18.5 C\ncondition: rain"),row(1,"It is still raining.","temperature: 65 F"),row(2,"It is 118.5 C.","temperature: 18.5 F")];
 const doc=replay(emptyDocument("a"),rows,[]);expect(doc.state.weatherDetails?.temperature?.value).toBe("18.5 C");
 expect(temperatureParts("18.5 C")?.number).toBe("18.5");
 expect(statedTemperature("20","The temperature was 20.")).toBe(true);
 expect(statedTemperature("20","The temperature was 20.5.")).toBe(false);
 expect(parseExpanded("temperature: 10-20 C")).toBeNull();
 doc.settings.weatherUnit="F";expect(renderMacro("phone_weather",doc)).toContain("18.5 C");
 expect(replay(readDocument(JSON.stringify(doc),"a"),rows,[]).state.weatherDetails?.temperature?.value).toBe("18.5 C");
});
test("a weather alert clears only with a literal ending and remains locked if requested",()=>{
 const start=row(0,"A coastal warning was issued.","weather_alert: Coastal warning");
 const fake=row(1,"The day ended.",'weather_alert: ended ~ "The day ended."');
 const end=row(2,"The coastal warning was lifted.",'weather_alert: ended ~ "The coastal warning was lifted."');
 const doc=emptyDocument("a");expect(replay(doc,[start,fake],[]).state.weatherDetails?.weather_alert?.value).toBe("Coastal warning");
 expect(replay(doc,[start,fake,end],[]).state.weatherDetails?.weather_alert?.value).toBe("ended");
 doc.edits.push({id:"lock",after:"m0",index:0,source:"lock",target:"weather",field:"weather_alert",value:"Coastal warning"});
 doc.fieldLocks={[fieldKey({target:"weather",field:"weather_alert"})]:true};
 expect(replay(doc,[start,end],[]).state.weatherDetails?.weather_alert?.value).toBe("Coastal warning");
});
test("weather edits and season are journal fields with independent protections",()=>{
 const doc=emptyDocument("a");doc.edits.push({id:"edit",after:null,index:-1,target:"weather",field:"temperature",value:"19"});
 const story=row(0,"It is 22 C in autumn.",'temperature: 22 C ~ "It is 22 C in autumn."\nseason: Autumn');
 expect(replay(doc,[story],[]).state.weatherDetails?.temperature?.value).toBe("19");
 doc.settings.allowAIUserEdits=true;const changed=replay(doc,[story],[]);
 expect(changed.state.weatherDetails?.temperature?.value).toBe("22 C");expect(changed.state.scene.season?.value).toBe("Autumn");
 expect(changed.state.userVersions?.[fieldKey({target:"weather",field:"temperature"})]?.value).toBe("19");
});
test("macros and helper honor weather switches and use Scene season once",()=>{
 const doc=emptyDocument("a");const story=row(0,"It is 20 C. It is autumn.","condition: cloudy\ntemperature: 20 C\nweather_description: Gray clouds\nseason: Autumn");
 const values=helperValues("condition: cloudy\ntemperature: 20 C\nweather_description: Gray clouds\nseason: Autumn",doc,[story]);
 expect(values).toEqual({weather:"cloudy",temperature:"20 C"});
 const next=replay(doc,[story],[]);expect(formatMacro(next)).not.toContain("Gray clouds");expect(formatMacro(next)).not.toContain("season:");
 next.settings.enabled["scene.season"]=true;next.settings.enabled["weather.description"]=true;
 expect(formatMacro(next)).toContain("season: Autumn");expect(renderMacro("phone_weather",next)).not.toContain("Autumn");
 expect(renderMacro("phone_weather",next)).toContain("Gray clouds");next.settings.apps.Weather=false;
 expect(renderMacro("phone_weather",next)).toBe("");expect(formatMacro(next)).not.toContain("condition: sunny");
});

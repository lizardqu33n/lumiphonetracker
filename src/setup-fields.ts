export const SETUP_GROUPS = [
  {app:"Contacts", fields:[
    ["contacts.phone","Phone"], ["contacts.email","Email"], ["contacts.relationship","Relationship type"],
    ["contacts.roles","Roles"], ["contacts.physical","Physical status"], ["contacts.mood","Mood"],
    ["contacts.position","Position"], ["contacts.attire","Attire"], ["contacts.thoughts","Inner thoughts"],
  ]},
  {app:"Notes", fields:[["notes.people","People"],["notes.items","Key items"],["notes.rules","Rules"],["notes.plots","Plots"],["notes.misc","Misc"]]},
  {app:"Locations", fields:[["locations","Locations"]]},
] as const;
export type SetupField = typeof SETUP_GROUPS[number]["fields"][number][0];
export const SETUP_FIELD_IDS:readonly SetupField[]=SETUP_GROUPS.flatMap(group=>group.fields.map(field=>field[0]));
export const setupFieldLabel=(id:SetupField):string=>SETUP_GROUPS.flatMap(group=>[...group.fields]).find(field=>field[0]===id)?.[1]??id;

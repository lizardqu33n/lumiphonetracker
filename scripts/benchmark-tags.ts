
import {transformTags} from "../src/tags";
const results=[];
for(const size of [100000,1000000,5000000]){
 for(const [kind,unit]of [["ordinary","Fictional prose. "],["many_tags",'<phone-text from="Ada">Hi</phone-text>'],["incomplete",'<unrelated> <phone-text from="Ada" ']]){
  const input=unit.repeat(Math.ceil(size/unit.length)).slice(0,size);
  const times=[];
  for(let i=0;i<3;i++){
   const start=performance.now();const output=transformTags(input,"display");Buffer.byteLength(output);
   times.push(performance.now()-start);
  }
  results.push({kind,characters:size,medianMs:times.sort((a,b)=>a-b)[1]});
 }
}
console.log(JSON.stringify(results));

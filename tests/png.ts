import {expect} from "bun:test";
import {inflateSync} from "node:zlib";
export function rgba(png:Buffer){
 expect(png.subarray(0,8).toString("hex")).toBe("89504e470d0a1a0a");const w=png.readUInt32BE(16),h=png.readUInt32BE(20);expect(png[24]).toBe(8);expect(png[25]).toBe(6);expect(png[28]).toBe(0);
 const idat:Buffer[]=[];for(let p=8;p+12<=png.length;){const size=png.readUInt32BE(p),type=png.toString("ascii",p+4,p+8);if(type==="IDAT")idat.push(png.subarray(p+8,p+8+size));p+=size+12;}
 const data=inflateSync(Buffer.concat(idat)),stride=w*4,out=Buffer.alloc(h*stride);let p=0;
 for(let y=0;y<h;y++){const filter=data[p++];if(filter>4)throw Error("Unsupported PNG filter");for(let x=0;x<stride;x++){const a=x>=4?out[y*stride+x-4]:0,b=y?out[(y-1)*stride+x]:0,c=y&&x>=4?out[(y-1)*stride+x-4]:0;let predictor=0;if(filter===1)predictor=a;else if(filter===2)predictor=b;else if(filter===3)predictor=Math.floor((a+b)/2);else if(filter===4){const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);predictor=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}out[y*stride+x]=(data[p++]+predictor)&255;}}
 return {w,h,out};
}
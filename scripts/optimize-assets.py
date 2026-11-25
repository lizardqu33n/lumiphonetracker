"""Generate smaller embedded PNGs from the original three TypeScript asset modules.
Requires Pillow only for regeneration. Run --source-dir PATH to a directory containing
emoji-assets.ts, weather-icons.ts and contact-icons.ts from the pre-optimization version.
No trimming, recoloring, palette reduction, external loading or artwork substitution.
"""
from pathlib import Path
from PIL import Image
import argparse,base64,hashlib,io,json,re

ROOT=Path(__file__).resolve().parent.parent
SIZES={"emoji-assets.ts":64,"weather-icons.ts":192,"contact-icons.ts":64}
PATTERN=re.compile(r'(?:"(?P<quoted>[a-z_]+)"|(?P<plain>[a-zA-Z]+))\s*:\s*"(?P<uri>data:image/png;base64,[A-Za-z0-9+/=]+)"')

def digest(data):return hashlib.sha256(data).hexdigest()
def build(source):
 report={"method":"Full-cell nearest-neighbor downscale; lossless optimized RGBA PNG. Original artwork, aspect ratio and transparency retained; source-resolution pixels are resampled.","files":[],"assets":[]}
 for name,limit in SIZES.items():
  text=(source/name).read_text(encoding="utf-8");before=len((source/name).read_bytes());original_total=0;output_total=0
  def convert(match):
   nonlocal original_total,output_total
   key=match['quoted'] or match['plain'];raw=base64.b64decode(match['uri'].split(',')[1]);original=Image.open(io.BytesIO(raw)).convert('RGBA');small=original.copy();small.thumbnail((limit,limit),Image.Resampling.NEAREST)
   out=io.BytesIO();small.save(out,format="PNG",optimize=True,compress_level=9);data=out.getvalue();decoded=Image.open(io.BytesIO(data)).convert('RGBA');assert decoded.tobytes()==small.tobytes()
   alpha=decoded.getchannel('A');original_total+=len(raw);output_total+=len(data)
   report['assets'].append({"module":name,"name":key,"source_size":list(original.size),"size":list(decoded.size),"source_png_sha256":digest(raw),"source_rgba_sha256":digest(original.tobytes()),"png_sha256":digest(data),"rgba_sha256":digest(decoded.tobytes()),"png_bytes":len(data),"alpha_min_max":list(alpha.getextrema()),"alpha_histogram":alpha.histogram(),"edge_alpha_max":[max(decoded.getchannel('A').crop(box).getdata()) for box in [(0,0,decoded.width,1),(decoded.width-1,0,decoded.width,decoded.height),(0,decoded.height-1,decoded.width,decoded.height),(0,0,1,decoded.height)]]})
   return match.group().replace(match['uri'],'data:image/png;base64,'+base64.b64encode(data).decode())
  optimized=PATTERN.sub(convert,text)
  optimized=optimized.replace('28 supplied emoji, lossless full-grid cells','28 supplied emoji, optimized full-cell PNGs').replace('Full, untrimmed 418-pixel cells','Full, untrimmed cells downscaled to 192 pixels').replace('Supplied PNG cells, copied without trimming, resizing or recoloring.','Supplied full-cell PNG artwork downscaled to 64 pixels; no trimming or recoloring.')
  (ROOT/'src'/name).write_bytes(optimized.replace('\r\n','\n').encode('utf-8'))
  report['files'].append({"module":name,"source_module_bytes":before,"module_bytes":len(optimized.encode()),"source_png_bytes":original_total,"png_bytes":output_total})
 assert len(report['assets'])==44
 (ROOT/'docs/ASSET-OPTIMIZATION.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
 print(json.dumps(report['files'],indent=2))
def check():
 report=json.loads((ROOT/'docs/ASSET-OPTIMIZATION.json').read_text(encoding='utf-8'));count=0
 for name in SIZES:
  text=(ROOT/'src'/name).read_text(encoding='utf-8')
  for match in PATTERN.finditer(text):
   key=match['quoted'] or match['plain'];expected=next(a for a in report['assets'] if a['module']==name and a['name']==key)
   raw=base64.b64decode(match['uri'].split(',')[1]);image=Image.open(io.BytesIO(raw)).convert('RGBA')
   assert digest(raw)==expected['png_sha256'] and digest(image.tobytes())==expected['rgba_sha256']
   assert list(image.size)==expected['size'] and image.getchannel('A').histogram()==expected['alpha_histogram'];count+=1
 assert count==44
 print('Verified all 44 optimized PNGs: dimensions, decoded RGBA, alpha and audited hashes.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 if args.check:check()
 elif args.source_dir:build(args.source_dir)
 else:parser.error('Use --source-dir PATH to generate, or --check to verify.')

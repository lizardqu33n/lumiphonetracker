"""Crop transparent padding only. Requires Pillow for regeneration/checking.
Run --source-dir PATH with the eight pre-trim TypeScript asset modules.
Every nonzero-alpha pixel (including faint glow) is preserved, without resizing.
"""
from pathlib import Path
from PIL import Image
import argparse,base64,hashlib,io,json,re
ROOT=Path(__file__).resolve().parent.parent
MODULES=['app-icons.ts','action-images.ts','field-icons.ts','ui-icons.ts','contact-icons.ts','weather-icons.ts','emoji-assets.ts','launcher-icon.ts']
URI=re.compile(r'data:image/png;base64,([A-Za-z0-9+/=]+)')
def sha(data):return hashlib.sha256(data).hexdigest()
def key(text,start):
 prefix=text[max(0,start-160):start];match=re.search(r'(?:"([^"\n]+)"|([A-Za-z_]+))\s*:\s*"$',prefix)
 return (match[1] or match[2]) if match else 'launcher'
def build(source):
 report={'method':'Tight alpha>0 bounding-box crop only; all visible pixels preserved exactly, including faint shadow/glow. No scaling or recoloring.','assets':[],'files':[]};converted=0
 for name in MODULES:
  text=(source/name).read_text(encoding='utf-8');before=(source/name).stat().st_size;raw_total=0
  def crop(match):
   nonlocal converted,raw_total
   ident=key(text,match.start());raw=base64.b64decode(match[1]);original=Image.open(io.BytesIO(raw)).convert('RGBA');box=original.getchannel('A').getbbox()
   if box is None:raise ValueError('Empty icon '+name+'/'+ident)
   cropped=original.crop(box);out=io.BytesIO();cropped.save(out,format='PNG',optimize=True,compress_level=9);data=out.getvalue() if box!=(0,0,*original.size) else raw
   decoded=Image.open(io.BytesIO(data)).convert('RGBA');assert decoded.tobytes()==cropped.tobytes()
   source_alpha=original.getchannel('A').histogram();alpha=decoded.getchannel('A').histogram();assert alpha[1:]==source_alpha[1:]
   raw_total+=len(data);converted+=box!=(0,0,*original.size)
   report['assets'].append({'module':name,'name':ident,'source_size':list(original.size),'bounds':list(box),'size':list(decoded.size),'source_png_sha256':sha(raw),'source_rgba_sha256':sha(original.tobytes()),'source_alpha_histogram':source_alpha,'source_edge_alpha_max':[original.getchannel('A').crop(edge).getextrema()[1] for edge in [(0,0,original.width,1),(original.width-1,0,original.width,original.height),(0,original.height-1,original.width,original.height),(0,0,1,original.height)]],'png_sha256':sha(data),'rgba_sha256':sha(decoded.tobytes()),'png_bytes':len(data),'alpha_histogram':alpha,'edge_alpha_max':[cropped.getchannel('A').crop(edge).getextrema()[1] for edge in [(0,0,cropped.width,1),(cropped.width-1,0,cropped.width,cropped.height),(0,cropped.height-1,cropped.width,cropped.height),(0,0,1,cropped.height)]]})
   return 'data:image/png;base64,'+base64.b64encode(data).decode()
  result=URI.sub(crop,text)
  if name=='ui-icons.ts':result=re.sub(r'UI_ICON_RAW_BYTES=\d+',f'UI_ICON_RAW_BYTES={raw_total}',result)
  result=re.sub(r'^(/\*.*?\*/|//[^\n]*)', '// Supplied artwork; transparent margins cropped without resizing or recoloring. See docs/ICON-CROPS.json.',result,count=1,flags=re.S if text.startswith('/*') else 0)
  (ROOT/'src'/name).write_bytes(result.replace('\r\n','\n').encode('utf-8'))
  report['files'].append({'module':name,'before_bytes':before,'after_bytes':len(result.encode('utf-8'))})
 assert len(report['assets'])==70
 report['cropped_count']=converted
 (ROOT/'docs/ICON-CROPS.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
 # Keep the earlier downscale provenance while pointing the current asset audit to cropped bytes.
 p=ROOT/'docs/ASSET-OPTIMIZATION.json';optimization=json.loads(p.read_text(encoding='utf-8'))
 for cell in optimization['assets']:
  cropped=next(a for a in report['assets'] if a['module']==cell['module'] and a['name']==cell['name'])
  cell['pre_trim']={'size':cropped['source_size'],'png_sha256':cropped['source_png_sha256'],'rgba_sha256':cropped['source_rgba_sha256'],'alpha_histogram':cropped['source_alpha_histogram'],'edge_alpha_max':cropped['source_edge_alpha_max']};cell['crop_bounds']=cropped['bounds']
  for k in ['size','png_sha256','rgba_sha256','alpha_histogram','png_bytes','edge_alpha_max']:cell[k]=cropped[k]
  visible=[i for i,n in enumerate(cropped['alpha_histogram']) if n];cell['alpha_min_max']=[min(visible),max(visible)]
 for item in optimization['files']:
  item['module_bytes']=(ROOT/'src'/item['module']).stat().st_size
  item['png_bytes']=sum(a['png_bytes'] for a in report['assets'] if a['module']==item['module'])
 optimization.pop('bundle',None);p.write_bytes((json.dumps(optimization,indent=2)+'\n').encode())
 print(f'Cropped {converted} padded images; {70-converted} already tight. All nonzero-alpha pixels preserved.')
def check():
 report=json.loads((ROOT/'docs/ICON-CROPS.json').read_text(encoding='utf-8'));count=0
 for name in MODULES:
  text=(ROOT/'src'/name).read_text(encoding='utf-8')
  for match in URI.finditer(text):
   cell=next(a for a in report['assets'] if a['module']==name and a['name']==key(text,match.start()));raw=base64.b64decode(match[1]);im=Image.open(io.BytesIO(raw)).convert('RGBA')
   assert sha(raw)==cell['png_sha256'] and sha(im.tobytes())==cell['rgba_sha256']
   assert list(im.size)==cell['size'] and im.getchannel('A').getbbox()==(0,0,*im.size)
   assert im.getchannel('A').histogram()[1:]==cell['source_alpha_histogram'][1:];count+=1
 assert count==70
 print('Verified 70 tight images, RGBA hashes and exact nonzero-alpha pixel counts.')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 if args.check:check()
 elif args.source_dir:build(args.source_dir)
 else:parser.error('Use --source-dir PATH to crop, or --check to verify.')

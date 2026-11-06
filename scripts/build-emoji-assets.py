"""Lossless full-cell cutter. Pillow is needed only to regenerate the embedded assets.
Run with the three original PNG paths in base, extra, final order.
"""
from pathlib import Path
from PIL import Image
from collections import Counter
import sys,io,json,base64,hashlib
NAMES=["smile laugh sad heart_eyes wink blush angry surprised sleepy heart thumbs_up sparkles".split(),"crying pensive content pleading happy_blush sad_pleading unamused angel".split(),"angry_devil devil happy_tear kiss_blush kiss_heart tongue sweat cool".split()]
def build(paths):
    root=Path(__file__).resolve().parent.parent;assets={};report={"sources":[],"cells":[],"correction":"Approved: move sleepy Z spill at x=236..300, y=719..723 from wink into 5 transparent rows above sleepy (3 visible + 2 faint alpha fringe rows); no face trimming."};raw_total=0
    for source,names,rows in zip(paths,NAMES,[3,2,2]):
        original=Path(source).read_bytes();im=Image.open(io.BytesIO(original)).convert("RGBA");assert im.width%4==0 and im.height%rows==0
        w,h=im.width//4,im.height//rows;alpha=im.getchannel("A");hist=alpha.histogram();report["sources"].append({"name":Path(source).name,"sha256":hashlib.sha256(original).hexdigest(),"size":[im.width,im.height],"grid":[4,rows],"cell":[w,h],"alpha_min_max":list(alpha.getextrema()),"alpha_histogram":hist,"transparent_pixels":hist[0],"partial_alpha_pixels":sum(hist[1:255]),"opaque_pixels":hist[255],"common_alpha_values":Counter(alpha.getdata()).most_common(5)})
        cells=[im.crop((i%4*w,i//4*h,(i%4+1)*w,(i//4+1)*h)) for i in range(len(names))]
        if rows==3:
            assert (w,h)==(362,362)
            spill=im.crop((236,719,301,724));cells[4].paste((0,0,0,0),(236,357,301,362));padded=Image.new("RGBA",(w,h+5),(0,0,0,0));padded.paste(cells[8],(0,5));padded.paste(spill,(236,0));cells[8]=padded
            assert cells[8].crop((0,5,w,h+5)).tobytes()==im.crop((0,724,w,1086)).tobytes()
        for i,(name,cell) in enumerate(zip(names,cells)):
            out=io.BytesIO();cell.save(out,format="PNG",optimize=True,compress_level=9);data=out.getvalue();assert Image.open(io.BytesIO(data)).convert("RGBA").tobytes()==cell.tobytes()
            assets[name]="data:image/png;base64,"+base64.b64encode(data).decode();raw_total+=len(data)
            report["cells"].append({"name":name,"source":Path(source).name,"bounds":[i%4*w,i//4*h,(i%4+1)*w,(i//4+1)*h],"size":list(cell.size),"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"rgba_sha256":hashlib.sha256(cell.tobytes()).hexdigest(),"alpha_min_max":list(cell.getchannel("A").getextrema())})
    report["raw_png_bytes"]=raw_total;report["data_uri_characters"]=sum(map(len,assets.values()))
    module="/** 28 supplied emoji, lossless full-grid cells; see docs/EMOJI-ASSETS.json. */\nexport const EMOJI_IMAGES = "+json.dumps(assets,indent=2)+" as const;\nexport type EmojiName=keyof typeof EMOJI_IMAGES;\nexport const EMOJI_NAMES=Object.keys(EMOJI_IMAGES) as EmojiName[];\n"
    (root/"src/emoji-assets.ts").write_text(module,encoding="utf-8",newline="\n");(root/"docs/EMOJI-ASSETS.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:report[k] for k in ["raw_png_bytes","data_uri_characters"]}))
if __name__=="__main__":
    if len(sys.argv)!=4:raise SystemExit("Pass the original base, extra and final spritesheet PNG paths.")
    build(sys.argv[1:])

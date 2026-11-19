import sys
from PIL import Image, ImageDraw, ImageFont
F="/usr/share/fonts/opentype/inter/Inter-{}.otf"; f=lambda w,s: ImageFont.truetype(F.format(w),s)
title, big, small, out = sys.argv[1:5]
W,H=1280,720; im=Image.new("RGB",(W,H),(14,26,23)); d=ImageDraw.Draw(im)
d.rounded_rectangle([60,50,104,94],radius=11,fill=(17,112,94)); d.ellipse([72,62,92,82],outline="white",width=4)
d.text((120,52),"AI SaaSavran",font=f("Bold",34),fill=(236,244,241))
x=60;y=150
for i,e in enumerate(["ChatGPT","Claude","Perplexity","Gemini"]):
    c=[(240,190,70),(60,200,160),(150,170,240),(230,160,210)][i]; tw=d.textlength(e,font=f("Bold",30))
    d.rounded_rectangle([x,y,x+tw+36,y+50],radius=25,outline=c,width=3); d.text((x+18,y+8),e,font=f("Bold",30),fill=c); x+=tw+52
y=240
def wrap(s,font,mw):
    out=[];l=""
    for w in s.split():
        t=(l+" "+w).strip()
        if d.textlength(t,font=font)<=mw: l=t
        else: out.append(l); l=w
    return out+[l]
for ln in wrap(title,f("ExtraBold",76),1160): d.text((60,y),ln,font=f("ExtraBold",76),fill=(236,244,241)); y+=88
d.rounded_rectangle([60,y+20,60+d.textlength(big,font=f("ExtraBold",56))+48,y+110],radius=20,fill=(240,190,70)); d.text((84,y+30),big,font=f("ExtraBold",56),fill=(14,26,23))
d.text((60,y+135),small,font=f("SemiBold",34),fill=(60,200,160))
im.save(out,quality=92)

// Personal workspace reconstructed from the owner’s scan. Dimensions in metres.
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
type V = [number, number, number];

/** Photo-guided workstation, deliberately stylized with generous bevels and readable details. */
export function buildWorkstation(parent:T.Group, importedMouse?:T.Object3D) {
 const root=new T.Group();root.name='Detailed workstation';root.position.set(0,0,.4);parent.add(root);
 const material=(color:string,roughness=.55,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const ivory=material('#eee8d7'),edge=material('#c7b293'),steel=material('#d6deda',.32,.55),dark=material('#17252d',.48),rubber=material('#10191e',.9),graphite=material('#33464d',.46,.15),pink=material('#bc527e'),lightPink=material('#f2c5c8'),cyan=material('#7ad2cd',.32),brass=material('#cba675',.35,.5);
 const mesh=(p:T.Object3D,n:string,g:T.BufferGeometry,m:T.Material,c:V=[0,0,0])=>{const o=new T.Mesh(g,m);o.name=n;o.position.set(...c);o.castShadow=o.receiveShadow=true;p.add(o);return o;};
 const box=(p:T.Object3D,n:string,s:V,c:V,m:T.Material,r=.006)=>mesh(p,n,new RoundedBoxGeometry(...s,3,Math.min(r,Math.min(...s)/2*.95)),m,c);
 // Round the face independently of thickness for screens and softbox panels.
 const panel=(p:T.Object3D,n:string,w:number,h:number,d:number,r:number,c:V,m:T.Material)=>{const shape=new T.Shape();const x=-w/2,y=-h/2;shape.moveTo(x+r,y);shape.lineTo(x+w-r,y);shape.quadraticCurveTo(x+w,y,x+w,y+r);shape.lineTo(x+w,y+h-r);shape.quadraticCurveTo(x+w,y+h,x+w-r,y+h);shape.lineTo(x+r,y+h);shape.quadraticCurveTo(x,y+h,x,y+h-r);shape.lineTo(x,y+r);shape.quadraticCurveTo(x,y,x+r,y);const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2,curveSegments:10});geo.translate(0,0,-d/2);return mesh(p,n,geo,m,c);};
 const ball=(p:T.Object3D,n:string,s:V,c:V,m:T.Material)=>{const o=mesh(p,n,new T.SphereGeometry(1,24,16),m,c);o.scale.set(...s);return o;};
 const tube=(p:T.Object3D,n:string,pts:V[],r:number,m:T.Material,segments=32)=>{const o=mesh(p,n,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),segments,r,10,false),m);if(r>=.007){ball(p,n+' rounded end',[r,r,r],pts[0],m);ball(p,n+' rounded end',[r,r,r],pts[pts.length-1],m);}return o;};
 const rod=(p:T.Object3D,n:string,a:V,b:V,r:number,m:T.Material,r2=r)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const o=mesh(p,n,new T.CylinderGeometry(r2,r,delta.length(),20),m);o.position.copy(start.addScaledVector(delta,.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;};
 const ring=(p:T.Object3D,n:string,r:number,t:number,c:V,m:T.Material)=>mesh(p,n,new T.TorusGeometry(r,t,8,40),m,c);
 const texture=(w:number,h:number,draw:(ctx:CanvasRenderingContext2D)=>void)=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d')!);const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;};
 const label=(p:T.Object3D,n:string,text:string,w:number,h:number,c:V,color='#c9dbd9',bg='#22323b')=>{const tex=texture(512,128,ctx=>{ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 42px sans-serif';ctx.fillText(text,256,67);});return mesh(p,n,new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tex,roughness:.6}),c);};

 // Laminated birch top and telescopic powder-coated standing-desk chassis.
 const desk=new T.Group();desk.name='Standing desk';root.add(desk);
 box(desk,'Birch layered edge',[1.287,.036,.78],[0,.752,0],edge,.013);
 box(desk,'Warm ivory work surface',[1.285,.010,.779],[0,.773,0],ivory,.012);
 for(const y of [.742,.749,.756])box(desk,'Plywood lamination',[1.265,.0012,.002],[0,y,.389],material('#8b765b'),.0003);
 for(const x of [-.50,.50]){
  box(desk,'Rounded sled foot',[.095,.043,.65],[x,.045,.01],ivory,.021);
  for(const z of [-.25,.27])box(desk,'Rubber leveling pad',[.07,.014,.07],[x,.017,z],rubber,.007);
  box(desk,'Lower telescopic column',[.075,.39,.078],[x,.25,-.055],ivory,.01);
  box(desk,'Column collar',[.079,.018,.082],[x,.436,-.055],edge,.004);
  box(desk,'Upper telescopic column',[.059,.30,.062],[x,.585,-.055],steel,.007);
  box(desk,'Mounting rail',[.065,.028,.55],[x,.723,-.025],ivory,.008);
  for(const z of [-.22,.22])rod(desk,'Countersunk fixing',[x,.708,z],[x,.716,z],.006,graphite);
 }
 box(desk,'Cross-member',[1.02,.048,.08],[0,.70,-.08],ivory,.01);
 box(desk,'Height control housing',[.125,.034,.065],[.48,.724,.318],dark,.009);
 label(desk,'Height readout','075',.047,.019,[.46,.725,.351],'#8df1dc','#16252a');
 for(const x of [.499,.522])ball(desk,'Height button',[.008,.008,.003],[x,.725,.352],graphite);
 box(desk,'Perforated cable basket',[.71,.075,.13],[-.02,.652,-.27],graphite,.012);
 for(let i=0;i<17;i++)box(desk,'Basket ventilation slot',[.026,.025,.003],[-.34+i*.04,.65,-.202],rubber,.005);
 box(desk,'Rear cable pass-through',[.48,.002,.022],[0,.779,-.325],edge,.005);
 box(desk,'Power strip',[.36,.038,.06],[-.08,.685,-.27],ivory,.006);
 for(let i=0;i<4;i++)box(desk,'Plug',[.045,.04,.035],[-.2+i*.08,.716,-.27],dark,.006);
 for(let i=0;i<5;i++)tube(desk,'Managed equipment lead',[[-.2+i*.09,.786,-.32],[-.22+i*.09,.70,-.34],[-.20+i*.1,.59,-.29],[.10,.61,-.27]],.0025,i%2?rubber:ivory,22);
 tube(desk,'Desk power cable',[[.28,.65,-.30],[.43,.51,-.32],[.44,.15,-.31],[.36,.04,-.32],[.25,.04,-.39]],.004,ivory);

 // Raspberry cutting mat with a true-scale fine grid and printed ruler.
 const matTexture=texture(1536,768,ctx=>{ctx.fillStyle='#ab4778';ctx.fillRect(0,0,1536,768);ctx.strokeStyle='#d781a6';ctx.lineWidth=1;for(let x=24;x<1512;x+=24){ctx.beginPath();ctx.moveTo(x,20);ctx.lineTo(x,748);ctx.stroke();}for(let y=24;y<748;y+=24){ctx.beginPath();ctx.moveTo(20,y);ctx.lineTo(1516,y);ctx.stroke();}ctx.strokeStyle='#efb4cd';ctx.lineWidth=2;ctx.strokeRect(24,24,1488,720);ctx.font='14px sans-serif';ctx.fillStyle='#f1c1d4';for(let x=48;x<1490;x+=48)ctx.fillText(String(x/48),x,18);ctx.font='600 19px sans-serif';ctx.fillText('CUTTING MAT  /  A2',1040,731);});
 const mat=new T.MeshStandardMaterial({map:matTexture,roughness:.93});box(root,'Cutting mat • rubber edge',[.76,.004,.35],[.04,.781,.155],pink,.005);const matFace=mesh(root,'Cutting mat • grid',new T.PlaneGeometry(.752,.342),mat,[.04,.7835,.155]);matFace.rotation.x=-Math.PI/2;

 // Mechanical keyboard: inset plate, individual sculpted keys, and an atlas of legends.
 const keyboard=new T.Group();keyboard.name='Mechanical keyboard';keyboard.position.set(-.08,.788,.145);root.add(keyboard);
 box(keyboard,'Beveled ivory keyboard shell',[.352,.025,.139],[0,.012,0],ivory,.009);box(keyboard,'Rose lower chassis',[.343,.008,.13],[0,.003,0],lightPink,.006);box(keyboard,'Recessed switch plate',[.333,.004,.122],[0,.027,0],graphite,.005);
 const rows=[['ESC','1','2','3','4','5','6','7','8','9','0','−','DEL'],['TAB','Q','W','E','R','T','Y','U','I','O','P','[',']'],['CAP','A','S','D','F','G','H','J','K','L',';','ENTER'],['SHIFT','Z','X','C','V','B','N','M',',','.','↑','END'],['CTRL','OPT','CMD','SPACE','CMD','←','↓','→']];
 const chars=[...new Set(rows.flat())];const atlas=texture(1024,512,ctx=>{ctx.clearRect(0,0,1024,512);ctx.fillStyle='#394851';ctx.textAlign='center';ctx.textBaseline='middle';chars.forEach((v,i)=>{ctx.font=`600 ${v.length>2?20:33}px sans-serif`;ctx.fillText(v,(i%16)*64+32,Math.floor(i/16)*64+33);});});const ink=new T.MeshStandardMaterial({map:atlas,alphaTest:.1,roughness:.7});
 rows.forEach((keys,row)=>{const units=keys.map(k=>k==='SPACE'?5:k==='ENTER'||k==='SHIFT'?1.8:k==='CAP'?1.2:1);const total=units.reduce((a,b)=>a+b,0),pitch=.322/total;let x=-.161;keys.forEach((k,i)=>{const width=units[i]*pitch-.0022,cx=x+units[i]*pitch/2,z=-.050+row*.025;const keyMat=k==='ESC'?pink:k==='ENTER'?cyan:k.length>1?edge:ivory;box(keyboard,`${k} key`,[width,.013,.0215],[cx,.035,z],keyMat,.003);const idx=chars.indexOf(k),g=new T.PlaneGeometry(Math.min(width*.85,.027),.015);const uv=g.attributes.uv;for(let j=0;j<uv.count;j++){uv.setXY(j,(idx%16+uv.getX(j))/16,1-(Math.floor(idx/16)+1-uv.getY(j))/8);}const decal=mesh(keyboard,`${k} legend`,g,ink,[cx,.0421,z]);decal.rotation.x=-Math.PI/2;x+=units[i]*pitch;});});
 const coil:V[]=[];for(let i=0;i<180;i++){const a=i/179*Math.PI*2*14;coil.push([-.28+i/179*.12,.804+Math.sin(a)*.006,-.055+Math.cos(a)*.006]);}tube(root,'Coiled keyboard USB cable',coil,.0018,ivory,200);tube(root,'Keyboard cable tail',[[-.08,.802,.075],[-.19,.793,-.04],[-.28,.804,-.05]],.002,ivory);

 // MX Master 4: a continuous asymmetric loft with separate sloping click surfaces.
 const mouse=new T.Group();mouse.name='Workspace mouse';mouse.position.set(.235,.784,.17);root.add(mouse);
 if(importedMouse) { mouse.add(importedMouse); } else {
 const mouseShell=material('#484a4b',.47),mouseButtons=material('#535557',.40),mouseGrip=material('#343638',.79),mouseSeam=material('#17191b',.8),wheelMetal=material('#bfc3c5',.26,.85);
 // Longitudinal cross-sections: z, left edge, right edge, crown height, crown x.
 const sections=[[-.064,-.024,.022,.026,-.006],[-.057,-.030,.030,.032,-.006],[-.034,-.033,.034,.041,-.007],[-.008,-.035,.036,.049,-.008],[.018,-.037,.035,.050,-.008],[.042,-.032,.029,.039,-.006],[.058,-.020,.019,.021,-.002],[.064,-.004,.004,.008,0]];
 const shape=(z:number,u:number):V=>{let j=0;while(j<sections.length-2&&z>sections[j+1][0])j++;const a=sections[j],b=sections[j+1],t=T.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1),v=a.map((n,i)=>T.MathUtils.lerp(n,b[i],t));const x=T.MathUtils.lerp(v[1],v[2],u);const crown=(v[4]-v[1])/(v[2]-v[1]);const q=u<crown?u/crown:(1-u)/(1-crown);return [x,.005+(v[3]-.005)*Math.pow(Math.max(0,Math.sin(q*Math.PI/2)),.66),z];};
 const patch=(name:string,z0:number,z1:number,u0:number,u1:number,m:T.Material,lift=0)=>{const g=new T.PlaneGeometry(1,1,32,48);const uv=g.attributes.uv,p=g.attributes.position;for(let i=0;i<p.count;i++){const v=shape(T.MathUtils.lerp(z0,z1,uv.getY(i)),T.MathUtils.lerp(u0,u1,uv.getX(i)));p.setXYZ(i,v[0],v[1]+lift,v[2]);}g.setIndex(Array.from(g.index!.array).reduce<number[]>((a,n,i,arr)=>{if(i%3===0)a.push(arr[i],arr[i+2],arr[i+1]);return a;},[]));g.computeVertexNormals();return mesh(mouse,name,g,m);};
 patch('Continuous sculpted palm body',-.064,.064,0,1,mouseShell);
 patch('Left sloping click paddle',-.063,-.013,.025,.49,mouseButtons,.0009);
 patch('Right sloping click paddle',-.060,-.017,.515,.975,mouseButtons,.0009);
 const clickSeam:V[]=[];for(let i=0;i<=32;i++){const u=i/32,v=shape(T.MathUtils.lerp(-.013,-.017,u),u);v[1]+=.0013;clickSeam.push(v);}tube(mouse,'Click paddle rear seam',clickSeam,.00065,mouseSeam,48);
 const centerSeam:V[]=[];for(let i=0;i<=24;i++){const v=shape(-.063+i/24*.048,.502);v[1]+=.0013;centerSeam.push(v);}tube(mouse,'Split between click paddles',centerSeam,.0006,mouseSeam,32);
 // Broad, low thumb wing with a recessed haptic panel.
 const wing=ball(mouse,'Flared thumb ledge',[.028,.006,.044],[-.031,.007,.015],mouseGrip);wing.rotation.y=-.2;
 const haptic=ball(mouse,'Haptic thumb panel',[.019,.004,.032],[-.038,.012,.019],mouseShell);haptic.rotation.y=-.22;
 for(let i=0;i<15;i++){const z=-.008+i*.003;const width=.010+Math.sin(i/14*Math.PI)*.018;tube(mouse,'Thumb panel fine rib',[[-.048,.015,z],[-.048+width*.5,.016,z+.002],[-.048+width,.016,z+.006]],.00035,mouseGrip,8);}
 const topWheel=new T.Group();topWheel.position.set(-.002,.037,-.040);topWheel.rotation.z=-.13;mouse.add(topWheel);
 box(topWheel,'Recessed wheel well',[.014,.004,.025],[0,-.003,0],mouseSeam,.004);
 rod(topWheel,'MagSpeed brushed silver wheel',[-.0045,0,0],[.0045,0,0],.010,wheelMetal);
 for(let i=0;i<36;i++){const a=i*Math.PI*2/36;rod(topWheel,'MagSpeed knurled ridge',[-.0046,Math.cos(a)*.010,Math.sin(a)*.010],[.0046,Math.cos(a)*.010,Math.sin(a)*.010],.00028,steel);}
 rod(mouse,'Silver horizontal thumb roller',[-.036,.030,-.014],[-.036,.030,.009],.0065,wheelMetal);
 for(let i=0;i<20;i++){const z=-.014+i*.0012;const r=ring(mouse,'Thumb roller machining',.0066,.00025,[-.036,.030,z],steel);r.rotation.x=0;}
 for(const z of [.017,.031]){const button=box(mouse,'Thumb navigation button',[.004,.008,.011],[-.034,.025,z],mouseSeam,.003);button.rotation.z=-.18;}
 box(mouse,'Mode shift button',[.007,.002,.009],[-.003,.050,-.004],mouseSeam,.002);
 ball(mouse,'Green battery indicator',[.001,.0005,.0015],[-.003,.0505,.006],new T.MeshBasicMaterial({color:'#69d978'}));
 box(mouse,'USB-C charging port',[.010,.0035,.0015],[0,.014,-.064],mouseSeam,.001);
 const logo=label(mouse,'Logi palm wordmark','logi',.014,.006,[.003,.047,.024],'#8c9091','#484a4b');logo.rotation.x=-Math.PI/2;
 }
 // Monitor with a beveled enclosure, rear vent fins, articulated arm and sharp illustrated UI.
 const monitor=new T.Group();monitor.name='Ultrawide monitor';monitor.position.set(.095,1.235,-.205);root.add(monitor);
 box(monitor,'Sculpted rear enclosure',[.977,.416,.049],[0,0,-.014],ivory,.018);box(monitor,'Graphite perimeter bezel',[.974,.414,.018],[0,0,.013],dark,.013);box(monitor,'Lower chin',[.954,.017,.008],[0,-.198,.024],graphite,.004);
 const ui=texture(2048,800,ctx=>{
  ctx.fillStyle='#142b37';ctx.fillRect(0,0,2048,800);ctx.fillStyle='#203d49';ctx.fillRect(0,0,2048,45);ctx.fillStyle='#aec7ce';ctx.font='20px sans-serif';ctx.fillText('●  ●  ●     WORKSPACE',24,29);ctx.textAlign='right';ctx.fillText('FRIDAY   12:24',2020,29);ctx.textAlign='left';
  ctx.fillStyle='#193440';ctx.fillRect(14,59,365,721);ctx.fillStyle='#84d9c7';ctx.font='bold 28px sans-serif';ctx.fillText('EXPLORER',41,102);ctx.font='23px monospace';['▾ ADRIAN / STUDIO','  ▾ room','    scene.ts','    materials.ts','    lighting.ts','  ▾ components','    desk.ts','    chair.ts','    monitor.ts','  ▸ textures','  ▸ references'].forEach((v,i)=>{if(i===3){ctx.fillStyle='#2b5360';ctx.fillRect(28,180,335,35);}ctx.fillStyle=i===3?'#d8ede6':'#86a7b4';ctx.fillText(v,43,148+i*44);});
  ctx.fillStyle='#203f4a';ctx.fillRect(393,59,1639,48);ctx.fillStyle='#e5c692';ctx.font='24px monospace';ctx.fillText('scene.ts   ×       materials.ts       ◇',416,92);
  const lines=['import { Scene, Color } from "three";','','const studio = new Scene();','studio.background = new Color("#173442");','','const desk = createWorkstation({','  finish: "warm ivory",','  accent: "raspberry",','  details: true,','});','','studio.add(desk, chair, monitor);','','// A little space to make things.','render(studio, camera);'];
  ctx.font='25px monospace';lines.forEach((v,i)=>{ctx.fillStyle='#547888';ctx.fillText(String(i+1).padStart(2,' '),414,150+i*37);ctx.fillStyle=v.startsWith('//')?'#709895':i%3===0?'#79cec9':i%3===1?'#e4bf87':'#d0dce1';ctx.fillText(v,474,150+i*37);});
  ctx.fillStyle='#0f252f';ctx.fillRect(394,715,1638,63);ctx.fillStyle='#85d3ae';ctx.font='22px monospace';ctx.fillText('✓ scene ready     3 objects selected                         60 FPS',421,753);
  ctx.fillStyle='#315461';ctx.fillRect(1940,126,70,540);for(let j=0;j<55;j++){ctx.fillStyle=['#75b8b8','#cfb78c','#819faa'][j%3];ctx.fillRect(1947+(j%3)*5,135+j*9,15+(j*17)%40,3);}
 });
 mesh(monitor,'Illustrated editor display',new T.PlaneGeometry(.944,.369),new T.MeshBasicMaterial({map:ui}),[0,.006,.023]);label(monitor,'Monitor wordmark','STUDIO',.049,.007,[0,-.199,.029],'#98b4b8','#33464d');ball(monitor,'Power LED',[.002,.002,.001],[.447,-.199,.030],cyan);
 for(let k=0;k<24;k++)box(monitor,'Rear cooling louvre',[.015,.066,.005],[-.34+k*.029,.12,-.041],graphite,.003);
 box(monitor,'VESA plate',[.108,.108,.015],[0,0,-.047],graphite,.012);for(const x of [-.037,.037])for(const y of [-.037,.037])rod(monitor,'VESA screw',[x,y,-.057],[x,y,-.065],.004,steel);
 box(root,'Monitor clamp',[.105,.05,.09],[.10,.731,-.345],graphite,.009);rod(root,'Monitor mast',[.10,.78,-.34],[.10,1.11,-.34],.022,steel);tube(root,'Articulated monitor arm',[[.10,1.06,-.34],[.21,1.14,-.31],[.095,1.235,-.265]],.025,graphite,12);ball(root,'Monitor pivot',[.034,.034,.025],[.095,1.235,-.27],graphite);
 tube(root,'Display cable',[[.10,1.21,-.27],[.21,1.04,-.31],[.13,.88,-.34],[.18,.68,-.31]],.004,rubber);
 // Sony A6000 mounted above the monitor. Lens type is a compact stylized approximation.
 const cam=new T.Group();cam.name='Sony A6000 on monitor mount';cam.position.set(.095,1.481,-.21);root.add(cam);
 box(cam,'Monitor mounting clamp',[.063,.025,.057],[0,-.025,-.006],graphite,.007);rod(cam,'Ball head',[0,-.025,0],[0,-.004,0],.012,steel);
 box(cam,'A6000 body',[.120,.0669,.0452],[0,.032,0],dark,.008);box(cam,'Right hand grip',[.028,.062,.028],[-.046,.030,.025],rubber,.009);
 box(cam,'Top plate',[.117,.007,.043],[0,.064,0],graphite,.003);box(cam,'Electronic viewfinder',[.025,.013,.027],[.043,.065,-.016],rubber,.004);
 rod(cam,'E-mount silver ring',[.008,.030,.021],[.008,.030,.026],.025,steel);rod(cam,'Compact zoom lens',[.008,.030,.026],[.008,.030,.062],.023,dark);rod(cam,'Focus ring',[.008,.030,.049],[.008,.030,.061],.024,graphite);rod(cam,'Front lens rim',[.008,.030,.062],[.008,.030,.067],.022,dark);rod(cam,'Optical glass',[.008,.030,.067],[.008,.030,.068],.017,material('#284c63',.10,.55));
 for(let k=0;k<28;k++){const a=k*Math.PI*2/28;rod(cam,'Focus ring rib',[.008+Math.cos(a)*.024,.030+Math.sin(a)*.024,.050],[.008+Math.cos(a)*.024,.030+Math.sin(a)*.024,.060],.0007,rubber);}
 rod(cam,'Shutter button',[-.044,.067,.012],[-.044,.072,.012],.006,steel);rod(cam,'Mode dial',[-.021,.067,-.007],[-.021,.073,-.007],.008,graphite);label(cam,'Sony wordmark','SONY',.023,.006,[-.011,.057,.024]);label(cam,'Alpha badge','α',.009,.009,[.046,.048,.024]);
 box(cam,'Rear LCD',[.074,.043,.003],[0,.032,-.025],rubber,.003);tube(cam,'Camera USB cable',[[.061,.025,0],[.077,-.02,-.025],[.065,-.12,-.055]],.0025,rubber);

 // White low-profile microphone arm with double struts, joints and a suspended capsule.
 const boom=new T.Group();boom.name='Microphone and white boom arm';root.add(boom);
 box(boom,'Desk clamp',[.055,.083,.06],[-.602,.748,.21],ivory,.008);rod(boom,'Clamp screw',[-.602,.681,.21],[-.602,.720,.21],.006,steel);rod(boom,'Clamp knob',[-.62,.681,.21],[-.585,.681,.21],.008,dark);
 const joints:V[]=[[-.60,.80,.21],[-.60,.97,.13],[-.32,1.04,.14]];
 for(let i=0;i<2;i++)for(const off of [-.012,.012])tube(boom,'Boom arm parallel rail',joints.slice(i,i+2).map(p=>[p[0],p[1]+off,p[2]] as V),.009,ivory,8);
 joints.forEach((p)=>{ball(boom,'Articulating hinge',[.023,.023,.023],p,ivory);rod(boom,'Hinge cap',[p[0],p[1],p[2]-.025],[p[0],p[1],p[2]+.025],.012,graphite);});
 const mic=new T.Group();mic.name='Audio-Technica AT2020USB';mic.position.set(-.31,1.09,.17);mic.rotation.x=-.40;mic.rotation.z=-.12;boom.add(mic);
 rod(mic,'AT2020USB body',[0,-.074,0],[0,.024,0],.026,dark);rod(mic,'Capsule grille',[0,.024,0],[0,.072,0],.025,graphite);ball(mic,'Rounded grille crown',[.025,.015,.025],[0,.072,0],graphite);
 for(let j=0;j<13;j++){const r=ring(mic,'Grille weave',.0253,.00065,[0,.025+j*.004,0],rubber);r.rotation.x=Math.PI/2;}for(let j=0;j<28;j++){const a=j*Math.PI*2/28;rod(mic,'Grille vertical wire',[Math.cos(a)*.0255,.025,Math.sin(a)*.0255],[Math.cos(a)*.0255,.074,Math.sin(a)*.0255],.0006,rubber);}
 rod(mic,'Lower cap',[0,-.074,0],[0,-.078,0],.025,graphite);label(mic,'Audio-Technica badge','AT2020 USB',.032,.009,[0,-.030,.0265]);ball(mic,'USB status LED',[.002,.002,.001],[0,-.048,.026],cyan);
 for(const y of [-.045,.015]){const r=ring(mic,'Shock mount ring',.039,.0035,[0,y,0],dark);r.rotation.x=Math.PI/2;}for(let k=0;k<6;k++){const a=k*Math.PI/3;tube(mic,'Suspension elastic',[[Math.cos(a)*.037,-.045,Math.sin(a)*.037],[Math.cos(a+.45)*.026,-.01,Math.sin(a+.45)*.026],[Math.cos(a)*.037,.015,Math.sin(a)*.037]],.0015,graphite,10);}
 tube(boom,'Microphone cable',[[-.31,1.025,.17],[-.40,.99,.15],[-.60,.95,.13],[-.60,.79,.21],[-.60,.61,.21]],.003,rubber);

 // Desk accessories observed in the scan: perforated silver computer, controller, earbuds and lamp.
 const computer=new T.Group();computer.name='Fractal Design Terra • silver';computer.position.set(-.49,.780,-.16);root.add(computer);
 const walnut=material('#81563c',.7);box(computer,'Aluminium enclosure',[.153,.198,.343],[0,.119,0],steel,.009);for(const x of [-.052,.052])for(const z of [-.125,.125])box(computer,'Terra foot',[.025,.020,.044],[x,.010,z],rubber,.004);
 box(computer,'Walnut front strip',[.150,.039,.009],[0,.041,.171],walnut,.004);for(let k=0;k<15;k++)box(computer,'Walnut grain',[.136,.0007,.0006],[0,.026+k*.002,.176],material(k%3?'#94684a':'#694630'),.0002);
 for(const x of [-.0766,.0766])for(let k=0;k<37;k++)box(computer,'Vertical side ventilation',[.001,.144,.004],[x,.133,-.148+k*.0082],graphite,.0004);
 for(let k=0;k<16;k++)box(computer,'Top ventilation slot',[.004,.001,.291],[-.061+k*.008,.218,-.005],graphite,.0004);
 rod(computer,'Front power button',[.046,.041,.176],[.046,.041,.179],.006,steel);box(computer,'Front USB-A port',[.012,.005,.001],[-.040,.041,.177],rubber,.001);box(computer,'Front USB-C port',[.008,.003,.001],[-.018,.041,.177],rubber,.001);label(computer,'Fractal wordmark','fractal',.032,.009,[0,.083,.1722],'#5d6969','#cbd3ce');
 const pad=new T.Group();pad.name='Colourful macro controller';pad.position.set(-.44,.786,.17);root.add(pad);box(pad,'Controller shell',[.086,.025,.10],[0,.014,0],ivory,.011);for(let x=0;x<3;x++)for(let z=0;z<3;z++)box(pad,'Macro key',[.020,.009,.021],[-.026+x*.026,.03,-.028+z*.027],[pink,cyan,brass,graphite][(x+z)%4],.004);rod(pad,'Encoder knob',[.027,.031,-.034],[.027,.046,-.034],.008,graphite);
 box(root,'Earbud case',[.047,.025,.040],[.15,.797,-.04],ivory,.012);box(root,'Case lid seam',[.046,.001,.038],[.15,.800,-.04],edge,.001);
 const lamp=new T.Group();lamp.name='Elgato Key Light Mini';lamp.position.set(.46,.78,-.28);root.add(lamp);rod(lamp,'Light base',[0,0,0],[0,.015,0],.060,graphite);rod(lamp,'Light stem',[0,.015,0],[0,.79,0],.008,steel);const head=panel(lamp,'Key Light Mini housing',.147,.100,.017,.017,[0,.82,0],graphite);head.rotation.y=-.16;const soft=panel(lamp,'Diffuser',.133,.086,.003,.013,[0,.82,.011],new T.MeshStandardMaterial({color:'#e5f4e8',emissive:'#b6e3d7',emissiveIntensity:.4}));soft.rotation.y=-.16;
 const headphones=new T.Group();headphones.name='Hanging headphones';headphones.position.set(-.56,.61,.25);root.add(headphones);tube(headphones,'Padded headband',[[-.059,-.03,0],[-.052,.06,0],[0,.093,0],[.052,.06,0],[.059,-.03,0]],.012,graphite);for(const x of [-.061,.061]){ball(headphones,'Ear cup',[.025,.045,.035],[x,-.035,0],dark);ball(headphones,'Ear cushion',[.011,.038,.030],[x+(x>0?-.02:.02),-.035,0],rubber);}

 // Glazed coffee mug on a cork coaster, with three drifting wisps of steam.
 const coffee=new T.Group();coffee.name='Coffee mug';coffee.position.set(.52,.780,.20);root.add(coffee);
 rod(coffee,'Cork coaster',[0,0,0],[0,.007,0],.059,material('#a77d54',.95));
 const glaze=material('#58a9a4',.24);const profile=[[0,.009],[.032,.009],[.039,.015],[.043,.085],[.044,.098],[.042,.102],[.039,.099],[.038,.024],[0,.024]].map(([r,y])=>new T.Vector2(r,y));
 mesh(coffee,'Hollow ceramic cup',new T.LatheGeometry(profile,64),glaze);
 const lip=ring(coffee,'Cream ceramic lip',.041,.0025,[0,.100,0],ivory);lip.rotation.x=Math.PI/2;
 tube(coffee,'Rounded mug handle',[[.038,.085,0],[.065,.085,0],[.071,.058,0],[.058,.034,0],[.040,.035,0]],.007,glaze,40);
 const drink=mesh(coffee,'Coffee surface',new T.CircleGeometry(.038,64),material('#382017',.24),[0,.089,0]);drink.rotation.x=-Math.PI/2;
 const crema=ring(coffee,'Crema at rim',.0365,.0009,[0,.0895,0],material('#b57c43',.7));crema.rotation.x=Math.PI/2;
 const vaporTexture=texture(128,256,ctx=>{const pixels=ctx.createImageData(128,256);for(let y=0;y<256;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,edge=Math.pow(Math.sin(Math.PI*x/127),2),fade=Math.sin(Math.PI*y/255);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(210*edge*fade*fade);}ctx.putImageData(pixels,0,0);});
 const steam=new T.Group();steam.name='Coffee steam';steam.userData.noMerge=true;steam.position.y=.097;coffee.add(steam);
 for(let i=0;i<3;i++){const m=new T.MeshBasicMaterial({map:vaporTexture,color:'#f5eee1',transparent:true,opacity:.48,depthWrite:false,side:T.DoubleSide});const w=mesh(steam,'Steam wisp '+i,new T.PlaneGeometry(1,1,6,40),m);w.castShadow=false;w.receiveShadow=false;w.userData.phase=i*2.1;w.userData.width=.009+i*.002;w.userData.offset=(i-1)*.016;}
 animateWorkstation(root,0);

 // Herman Miller Aeron: open woven suspension, a shaped perimeter and visible rear linkage.
 const chair=new T.Group();chair.name='Herman Miller Aeron • stylized';chair.position.set(0,0,.51);chair.rotation.y=-.11;root.add(chair);
 const weaveTex=texture(128,128,ctx=>{ctx.fillStyle='#96aeb0';ctx.fillRect(0,0,128,128);ctx.fillStyle='#263b43';for(let i=0;i<128;i+=8){ctx.fillRect(i,0,3,128);ctx.fillRect(0,i,128,3);}});weaveTex.wrapS=weaveTex.wrapT=T.RepeatWrapping;weaveTex.repeat.set(5,5);
 const weaveAlpha=texture(128,128,ctx=>{ctx.fillStyle='#111';ctx.fillRect(0,0,128,128);ctx.fillStyle='#fff';for(let i=0;i<128;i+=8){ctx.fillRect(i,0,4,128);ctx.fillRect(0,i,128,4);}});weaveAlpha.colorSpace=T.NoColorSpace;weaveAlpha.wrapS=weaveAlpha.wrapT=T.RepeatWrapping;weaveAlpha.repeat.set(5,5);const weave=new T.MeshStandardMaterial({color:'#667b80',map:weaveTex,alphaMap:weaveAlpha,alphaTest:.5,roughness:.93,side:T.DoubleSide});
 rod(chair,'Gas lift barrel',[0,.10,0],[0,.32,0],.035,graphite);rod(chair,'Polished gas piston',[0,.29,0],[0,.415,0],.020,steel);box(chair,'Tilt mechanism',[.16,.07,.17],[0,.397,.01],dark,.019);
 for(let k=0;k<5;k++){const a=k*Math.PI*2/5+.15,dir=(r:number,y:number):V=>[Math.sin(a)*r,y,Math.cos(a)*r];tube(chair,'Swept five-star spoke',[dir(.015,.15),dir(.13,.13),dir(.25,.078),dir(.31,.066)],.020,graphite,18);const wheel=new T.Group();wheel.name='Twin caster';wheel.position.set(...dir(.31,.043));wheel.rotation.y=a+.4;chair.add(wheel);for(const x of [-.018,.018]){rod(wheel,'Caster tyre',[x-.009,0,0],[x+.009,0,0],.030,rubber);rod(wheel,'Caster hub',[x-.010,0,0],[x+.010,0,0],.014,graphite);}rod(wheel,'Caster swivel',[0,.01,0],[0,.047,0],.009,steel);}
 const seatPoint=(u:number,v:number):V=>{const denom=Math.pow(Math.pow(u,4)+Math.pow(v,4),.25);const factor=denom>0?Math.max(Math.abs(u),Math.abs(v))/denom:1;u*=factor;v*=factor;const x=u*(.229-.025*v*v),z=v*.216;return [x,.465+.027*(u*u)+.018*(v*v)-.019*(1-u*u)*(1-v*v),z];};
 const backPoint=(u:number,v:number):V=>{const width=.163+.066*Math.sin(v*Math.PI*.75);return [u*width,.51+v*.49-.043*Math.pow(u,4)*Math.pow(v,6)+.025*Math.pow(u,4)*Math.pow(1-v,6),.19+.105*v-.035*(1-u*u)*Math.sin(v*Math.PI)];};
 function surface(name:string,fn:(u:number,v:number)=>V,v0:number,v1:number){const g=new T.PlaneGeometry(1,1,36,36);const p=g.attributes.position;for(let i=0;i<p.count;i++){const uv=g.attributes.uv;const v=fn(uv.getX(i)*2-1,v0+uv.getY(i)*(v1-v0));p.setXYZ(i,...v);}g.computeVertexNormals();return mesh(chair,name,g,weave);}
 surface('Suspended woven seat',seatPoint,-1,1);surface('Contoured woven back',backPoint,0,1);
 const seatEdge:V[]=[];for(let i=0;i<=25;i++)seatEdge.push(seatPoint(-1,-1+2*i/25));for(let i=1;i<=25;i++)seatEdge.push(seatPoint(-1+2*i/25,1));for(let i=1;i<=25;i++)seatEdge.push(seatPoint(1,1-2*i/25));for(let i=1;i<=25;i++)seatEdge.push(seatPoint(1-2*i/25,-1));tube(chair,'Sculpted seat perimeter',seatEdge,.016,dark,120);
 const backEdge:V[]=[];for(let i=0;i<=25;i++)backEdge.push(backPoint(-1,i/25));for(let i=1;i<=25;i++)backEdge.push(backPoint(-1+2*i/25,1));for(let i=1;i<=25;i++)backEdge.push(backPoint(1,1-i/25));for(let i=1;i<=25;i++)backEdge.push(backPoint(1-2*i/25,0));tube(chair,'Continuous backrest frame',backEdge,.019,dark,120);
 for(const side of [-1,1]){tube(chair,'Rear Y support',[[side*.045,.40,.13],[side*.065,.56,.245],[side*.11,.72,.28],[side*.224,.88,.286]],.019,graphite);tube(chair,'Cantilever arm support',[[side*.19,.41,.12],[side*.265,.49,.15],[side*.265,.64,.09]],.017,graphite);const arm=box(chair,'Sculpted arm pad',[.079,.045,.25],[side*.265,.674,.014],dark,.025);arm.rotation.x=-.07;rod(chair,'Arm height dial',[side*.26,.586,.10],[side*.286,.586,.10],.023,dark);}
 box(chair,'Lumbar suspension',[.235,.055,.028],[0,.637,.264],graphite,.022);rod(chair,'Lumbar adjuster',[0,.623,.274],[0,.66,.277],.012,dark);
 tube(chair,'Recline adjustment stalk',[[.065,.398,.03],[.16,.385,-.04],[.205,.385,-.055]],.007,steel);box(chair,'Recline paddle',[.055,.018,.030],[.21,.389,-.056],dark,.008);rod(chair,'Tension knob',[-.13,.383,.02],[-.18,.383,.02],.025,graphite);
 label(chair,'Rear maker badge','Herman Miller',.075,.014,[0,.56,.266],'#c3d0c8','#33464d');
 return root;
}

/** Deform the small steam ribbons in-place; the exported model keeps their resting pose. */
export function animateWorkstation(root:T.Object3D,time:number) {
 const steam=root.getObjectByName('Coffee steam');if(!steam)return;
 steam.children.forEach((child,i)=>{const w=child as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>,p=w.geometry.attributes.position,uv=w.geometry.attributes.uv;for(let j=0;j<p.count;j++){const v=uv.getY(j),u=uv.getX(j)-.5,phase=w.userData.phase;const drift=Math.sin(v*9-time*1.2+phase)*(.003+v*.011);p.setXYZ(j,w.userData.offset+drift+u*w.userData.width*(1+v),v*(.20+i*.026),Math.cos(v*7-time*.8+phase)*v*.013+u*w.userData.width*.5);}p.needsUpdate=true;w.geometry.computeBoundingSphere();w.material.opacity=.40+.10*Math.sin(time*.8+i);});
}

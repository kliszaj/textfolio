import * as T from 'three';

export type WorkspaceScene = 'design' | 'meeting' | 'coding' | 'video' | 'sleep';
export function sceneForHour(hour: number): WorkspaceScene {
  if (hour < 6) return 'sleep';
  if (hour < 11) return 'design';
  if (hour < 13) return 'meeting';
  if (hour < 18) return 'coding';
  return 'video';
}

/** Illustrated app layouts, drawn locally rather than loading third-party embeds. */
function screenTexture(scene: WorkspaceScene) {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 600;
  const c = canvas.getContext('2d')!;
  const rect = (x:number,y:number,w:number,h:number,color:string,r=0) => {c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();};
  const text = (t:string,x:number,y:number,size=20,color='#dce6ef') => {c.font=`500 ${size}px system-ui`;c.fillStyle=color;c.fillText(t,x,y);};
  const circle = (x:number,y:number,r:number,color:string) => {c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
  rect(0,0,1536,600,'#111922');
  if (scene === 'sleep') {rect(0,0,1536,600,'#080f15');}
  if (scene === 'design') {
    rect(0,0,1536,48,'#242529'); text('Figma   /   Portfolio explorations',24,31);rect(1390,9,115,30,'#7967ec',7);text('Share',1420,31,17);
    rect(0,48,220,552,'#f8f8fa');rect(220,48,1080,552,'#dedee5');rect(1300,48,236,552,'#f8f8fa');
    text('Layers',22,86,20,'#242735');['Page 01','◇  Desktop','    Header','    Selected work','    About me','◇  Mobile'].forEach((s,i)=>text(s,22,140+i*43,17,'#686b7a'));
    text('Design   Prototype',1320,85,17,'#242735');['Frame','W  1440    H  960','Layout','Fill   #F5EEDD','Corner radius  24','Export  +'].forEach((s,i)=>text(s,1320,140+i*58,16,'#686b7a'));
    rect(280,107,620,414,'#f8f0de',3);text('ADRIAN / DESIGNER',312,145,17,'#3c443c');text('Thoughtful things,',312,215,39,'#253e35');text('made for people.',312,261,39,'#253e35');rect(313,288,132,29,'#284c3c',15);text('Explore work ↗',327,308,14);
    ['#bc76a0','#8dafa0','#d9b77f'].forEach((color,i)=>{rect(313+i*182,348,163,130,color,9);circle(394+i*182,406,37,'#f5e8cf');});
    rect(948,107,245,414,'#f8f0de',18);text('Hello, I’m Adrian.',969,155,20,'#253e35');rect(968,181,205,190,'#8dafa0',9);circle(1070,272,65,'#f5e8cf');rect(968,393,205,96,'#bc76a0',9);
    c.strokeStyle='#8875ff';c.lineWidth=3;c.strokeRect(278,105,624,418);[[278,105],[902,105],[278,523],[902,523]].forEach(([x,y])=>rect(x-5,y-5,10,10,'#fff'));text('Desktop / exploration 04',280,91,15,'#6552ba');
  }
  if (scene === 'meeting') {
    text('Google Meet',28,37,23);text('Design catch-up',610,37,21);circle(1485,28,7,'#74d6a1');
    const colors=['#3b5962','#79675f','#64567d','#486d63','#625d7a','#3c6676'];
    ['Maya','Alex','Sam','Lou','Chris','You'].forEach((name,i)=>{const x=24+(i%3)*501,y=65+Math.floor(i/3)*221;rect(x,y,486,205,colors[i],13);circle(x+243,y+77,37,['#e1b39a','#b7866b','#eac5a2'][i%3]);c.fillStyle=['#c3a3de','#d5c78d','#97c9c2'][i%3];c.beginPath();c.ellipse(x+243,y+183,80,65,0,Math.PI,Math.PI*2);c.fill();rect(x+14,y+165,91,27,'#26333e',6);text(name,x+24,y+184,16);if(i===5){c.strokeStyle='#8db2ff';c.lineWidth=3;c.strokeRect(x+2,y+2,482,201);}});
    text('11:00  •  Daily design sync',28,563,18);[620,685,750,815].forEach(x=>circle(x,553,23,'#35414e'));text('🎙',608,560,20);text('▣',675,560,20);text('CC',738,559,15);text('⋯',805,560,20);rect(865,530,81,46,'#e36b70',23);text('⌁',891,560,28);
  }
  if (scene === 'video') {
    rect(0,0,1536,57,'#18191d');rect(23,17,34,23,'#ff4349',6);text('▶',33,34,15,'#fff');text('YouTube',67,37,24,'#fff');rect(450,12,600,35,'#292b30',18);text('Search',475,36,17,'#9299a3');
    const grad=c.createLinearGradient(0,80,0,440);grad.addColorStop(0,'#284c6a');grad.addColorStop(.65,'#df987f');grad.addColorStop(1,'#edc997');c.fillStyle=grad;c.fillRect(25,78,1055,425);
    circle(743,239,70,'#ffe6ac');
    ['#3c6270','#2b4a5a','#193746'].forEach((color,i)=>{c.fillStyle=color;c.beginPath();c.moveTo(25,503);for(let x=25;x<=1080;x+=35)c.lineTo(x,350+i*45+Math.sin(x*.009+i*2)*45);c.lineTo(1080,503);c.fill();});
    text('SLOW EVENINGS',75,156,38,'#fff3d6');text('A little room to breathe.',78,194,20,'#fff3d6');rect(43,480,1014,3,'#ffffff55');rect(43,480,410,3,'#ff5359');text('Ⅱ   12:48 / 48:00',47,463,16);text('A quiet evening in the mountains • design & unwind',26,542,25);text('STILL STUDIO     128K views',26,580,17,'#9ba7b6');
    ['A desk worth coming home to','Making things, slowly','Late night studio radio'].forEach((s,i)=>{rect(1110,78+i*157,170,110,['#667a89','#a88379','#685e88'][i],9);circle(1195,132+i*157,29,'#ead9ac');text(s.split(' ').slice(0,3).join(' '),1297,105+i*157,16);text(s.split(' ').slice(3).join(' '),1297,129+i*157,16);text('Studio journal',1297,161+i*157,13,'#8c98a9');});
  }

  // Compose the apps as windows on a shared illustrated desktop.
  if (scene !== 'sleep') {
    const app = document.createElement('canvas'); app.width=1536;app.height=600;
    app.getContext('2d')!.drawImage(canvas,0,0);
    const sky=c.createLinearGradient(0,0,1536,600);
    sky.addColorStop(0,scene==='video'?'#202044':'#b8cbd1');sky.addColorStop(1,scene==='video'?'#79638e':'#e6c2a0');
    c.fillStyle=sky;c.fillRect(0,0,1536,600);
    ['#859998','#4c696d','#334b59'].forEach((color,i)=>{c.fillStyle=scene==='video'?['#55446e','#403858','#2b2c49'][i]:color;c.beginPath();c.moveTo(0,600);for(let x=0;x<=1536;x+=24)c.lineTo(x,410+i*55+Math.sin(x*.004+i)*70);c.lineTo(1536,600);c.fill();});
    rect(0,0,1536,26,'#18263288');text('●   Finder     File   Edit   View',18,19,14);text('Adrian’s studio',1370,19,14);
    const windowFrame=(x:number,y:number,w:number,h:number,title:string)=>{rect(x+5,y+8,w,h,'#00000035',12);rect(x,y,w,h,'#20262f',10);[0,1,2].forEach(i=>circle(x+15+i*15,y+13,4,['#ef817a','#eac66c','#8aca9d'][i]));text(title,x+72,y+18,14);};
    const figma=(x:number,y:number,w:number,h:number)=>{windowFrame(x,y,w,h,'Figma / Portfolio');rect(x+3,y+27,w-6,h-30,'#dfe0e7');rect(x+3,y+27,70,h-30,'#f5f5f8');text('Layers',x+12,y+55,13,'#4c4b5b');['Desktop','Header','Work','Mobile'].forEach((t,i)=>text(t,x+12,y+90+i*28,11,'#777582'));rect(x+91,y+65,w-116,h-100,'#f6eedc',4);text('Made for people.',x+110,y+116,25,'#314e43');['#a9bca7','#cc92af','#d8b67c'].forEach((col,i)=>rect(x+110+i*(w-155)/3,y+150,(w-170)/3,h-209,col,7));};
    if(scene==='design') {
      windowFrame(25,55,410,470,'Slack / Studio');rect(28,82,117,440,'#442b49');text('Studio',42,113,22);['# general','# design','# inspiration','Messages','Maya','Alex'].forEach((t,i)=>text(t,42,157+i*38,14));rect(145,82,287,440,'#faf8f6');text('# design',164,114,23,'#302c37');['Morning, team ☀','New explorations are ready.','Love this direction!','Let’s review at 11.'].forEach((t,i)=>{rect(164,144+i*76,27,27,['#9abcb1','#d3a6ba'][i%2],6);text(i%2?'Adrian':'Maya',204,157+i*76,15,'#3e3945');text(t,204,179+i*76,13,'#716877');});
      windowFrame(455,55,1055,470,'Figma');c.drawImage(app,458,82,1049,440);
      windowFrame(1112,435,368,123,'Spotify');rect(1125,471,64,64,'#b49a74',5);circle(1157,503,19,'#304f48');text('Focus flow',1204,490,19);text('Studio playlist',1204,513,14,'#a9b7b1');text('◀    Ⅱ    ▶',1321,541,17,'#8be7aa');
    }
    if(scene==='meeting') {figma(25,58,630,487);windowFrame(680,58,830,487,'Google Meet / Design catch-up');c.drawImage(app,683,85,824,457);}
    if(scene==='coding') {
      windowFrame(25,55,730,490,'Claude Code');rect(28,82,724,460,'#201e1c');text('✳ Claude Code',56,125,30,'#dfaa8e');text('Portfolio / a little space to make things',56,160,18,'#a9a098');
      ['> Build the mobile prototype','', '● Reading components / workspace', '● Updating responsive layout', '  ✓ Mobile navigation', '  ✓ Project cards', '  ✓ Motion and transitions', '', 'Preview is ready on localhost.', '', '────────────────────────────────────', '> Refine the spacing on the cards'].forEach((t,i)=>text(t,56,207+i*26,18,i===0||i===11?'#eee5d9':i>2&&i<7?'#a4c6a2':'#b6aaa1'));
      windowFrame(778,55,732,490,'localhost / Prototype preview');rect(781,82,726,460,'#e0e6e7');text('MOBILE PREVIEW   /   390 × 844',969,111,14,'#617278');rect(1011,130,263,392,'#202a32',33);rect(1019,138,247,376,'#f7efdf',27);rect(1099,146,86,15,'#202a32',9);text('ADRIAN',1041,192,17,'#3d5648');text('Made for',1041,234,29,'#3d5648');text('people.',1041,267,29,'#3d5648');rect(1038,292,209,111,'#a7baac',12);circle(1142,347,37,'#f4e4c6');rect(1038,418,98,75,'#cd9caf',10);rect(1149,418,98,75,'#d8b780',10);
    }
    if(scene==='video') {windowFrame(238,87,1060,426,'YouTube');c.drawImage(app,241,114,1054,396);}
    rect(584,566,368,29,'#e2e5ef44',11);['#8eace0','#c6a4cf','#e3a88c','#8bc8a7','#d3bd84','#a4a0ce','#e09191','#aac3cc'].forEach((col,i)=>rect(597+i*43,571,22,19,col,4));
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;
}

// illustratedScreen: false leaves the display's own texture alone, for a host
// that lays its own content over the screen.
export function prepareScenes(root:T.Group,{illustratedScreen=true}:{illustratedScreen?:boolean}={}) {
  const coffee=root.getObjectByName('Coffee mug')!;
  const drink=root.getObjectByName('Coffee surface')!;
  const crema=root.getObjectByName('Crema at rim')!;
  const steam=root.getObjectByName('Coffee steam')!;
  // Keep the liquid independent of the mug's static geometry batching.
  drink.userData.noMerge=true;crema.userData.noMerge=true;
  const keyboard=root.getObjectByName('Mechanical keyboard')!;
  const mouse=root.getObjectByName('Workspace mouse')!;
  const tray=root.getObjectByName('Colourful macro controller')!;
  const mat=new T.Group();root.add(mat);
  for(const name of ['Cutting mat • rubber edge','Cutting mat • grid']) mat.add(root.getObjectByName(name)!);
  const boom=root.getObjectByName('Microphone and white boom arm')!;
  const pivot=new T.Group();pivot.name='Microphone swing pivot';pivot.position.set(-.60,.80,.21);root.add(pivot);
  root.updateMatrixWorld(true);
  for(const child of [...boom.children]) if(!['Desk clamp','Clamp screw','Clamp knob'].includes(child.name)) pivot.attach(child);
  const chair=root.getObjectByName('Herman Miller Aeron • stylized')!;
  const screen=root.getObjectByName('Illustrated editor display') as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
  const diffuser=root.getObjectByName('Diffuser') as T.Mesh<T.BufferGeometry,T.MeshStandardMaterial>;
  // Preserve moving parts as separate batching roots; keep the screen material editable.
  screen.userData.noMerge=true;diffuser.userData.noMerge=true;
  const textures:Partial<Record<WorkspaceScene,T.Texture>>=illustratedScreen?{design:screenTexture('design'),meeting:screenTexture('meeting'),coding:screenTexture('coding'),video:screenTexture('video'),sleep:screenTexture('sleep')}:{};
  const overlay=new T.Mesh(screen.geometry,new T.MeshBasicMaterial({map:screen.material.map,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));overlay.position.z=.0005;overlay.visible=illustratedScreen;screen.add(overlay);
  // The mug's last resting place (its meeting spot) before the water glass
  // takes over; the ring matches the cup's base.
  const MUG_LAST={x:.55,z:.12};
  const ring=new T.Mesh(new T.RingGeometry(.031,.035,64),new T.MeshBasicMaterial({color:'#85572e',transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false}));ring.userData.noMerge=true;ring.name='Morning coffee ring';ring.rotation.x=-Math.PI/2;ring.position.set(MUG_LAST.x,.7785,MUG_LAST.z);root.add(ring);
  const notebook=root.getObjectByName('Field Notes notebook')!;
  const notebookBack=root.getObjectByName('Field Notes back')!;
  const leaf=root.getObjectByName('Field Notes leaf')!;
  const staples=root.getObjectByName('Field Notes staples')!;
  const pen=root.getObjectByName('Desk pen')!;
  // The memo book lives closed in the front-right corner with the pen on it.
  // In the midday meeting it comes out in front of the keyboard and opens,
  // the pen set down on the page, then goes back once the meeting is over.
  const MAT=.7835,DESK=.778;
  const STOWED={x:.575,y:DESK,z:.315,turn:-.08};
  const WRITING={x:-.0355,y:MAT,z:.26,turn:.05};
  // The pen rests on its octagonal cap's flats.
  const CLOSED_TOP=.0036,OPEN_TOP=.0019,PEN_RADIUS=.0063;
  // Opening takes about a second; the pen moves aside while the cover swings.
  const OPEN_ANGLE=Math.PI,OPEN_SPEED=3.5,SETTLED=.01;
  const glass=new T.Group();glass.name='Afternoon water glass';glass.position.set(.49,.782,.02);root.add(glass);
  const shell=new T.Mesh(new T.CylinderGeometry(.032,.027,.112,40,1,true),new T.MeshPhysicalMaterial({color:'#d2f4ee',transparent:true,opacity:.28,roughness:.12,side:T.DoubleSide}));shell.position.y=.056;glass.add(shell);
  const water=new T.Mesh(new T.CylinderGeometry(.029,.025,.072,40),new T.MeshPhysicalMaterial({color:'#9fd3d9',transparent:true,opacity:.45,roughness:.16}));water.position.y=.037;glass.add(water);
  const lip=new T.Mesh(new T.TorusGeometry(.032,.0014,8,40),new T.MeshStandardMaterial({color:'#d7f5ef',transparent:true,opacity:.7}));lip.rotation.x=Math.PI/2;lip.position.y=.112;glass.add(lip);
  const key=new T.PointLight('#fff1d6',0,2,2);key.position.set(.46,1.60,-.20);root.add(key);
  const backlight=new T.PointLight('#eab58b',0,1.8,2);backlight.position.set(.095,1.10,-.29);root.add(backlight);
  const spill=new T.PointLight('#adcfff',0,1.8,2);spill.position.set(.095,1.12,.06);root.add(spill);
  const led=new T.Mesh(new T.SphereGeometry(.003,12,8),new T.MeshBasicMaterial({color:'#ff675e'}));led.userData.noMerge=true;led.position.set(.14,1.52,-.181);root.add(led);
  if(textures.coding){screen.material.map?.dispose();screen.material.map=textures.coding;overlay.material.map=textures.coding;}
  let active:WorkspaceScene='coding',fade=1;
  // The mug and the glass come and go as if picked up and put down -- rising
  // a little as they shrink away -- and the coffee ring fades, rather than
  // blinking between scenes. 0 is gone, 1 is on the desk; the first update
  // snaps, so the desk doesn't open with things growing in.
  const RING_OPACITY=.3,LIFT=.035,APPEAR_RATE=4;
  const mugY=coffee.position.y,glassY=glass.position.y;
  let mugShown=0,glassShown=0,first=true;
  const appear=(o:T.Object3D,shown:number,baseY:number)=>{const e=shown*shown*(3-2*shown);o.visible=shown>.01;o.scale.setScalar(e);o.position.y=baseY+(1-e)*LIFT;};
  return {
    roots:[coffee,chair,glass,keyboard,mouse,tray,pivot,mat,notebookBack,leaf,staples,pen],
    update(hour:number,delta:number,reduced:boolean,darkness=0) {
      const next=sceneForHour(hour),k=reduced?1:1-Math.exp(-delta*5);
      if(next!==active){const map=textures[next];if(map){overlay.material.map=screen.material.map;screen.material.map=map;overlay.material.opacity=1;fade=0;}active=next;}
      fade=reduced?1:Math.min(1,fade+delta*1.5);overlay.material.opacity=1-fade;
      const meeting=next==='meeting',sleep=next==='sleep',video=next==='video';
      pivot.rotation.y=T.MathUtils.lerp(pivot.rotation.y,meeting?-1.05:0,k);
      keyboard.rotation.y=T.MathUtils.lerp(keyboard.rotation.y,video?.055:meeting?-.025:0,k);
      // Pushed back a little in the meeting to make room for the open notebook.
      keyboard.position.z=T.MathUtils.lerp(keyboard.position.z,video?.155:meeting?.115:.145,k);
      mouse.position.x=T.MathUtils.lerp(mouse.position.x,meeting?.27:video?.25:.235,k);
      mouse.position.z=T.MathUtils.lerp(mouse.position.z,video?.205:meeting?.145:.17,k);
      mouse.rotation.y=T.MathUtils.lerp(mouse.rotation.y,video?-.15:meeting?.09:0,k);
      mat.position.z=T.MathUtils.lerp(mat.position.z,video?.006:meeting?-.004:0,k);
      tray.rotation.y=T.MathUtils.lerp(tray.rotation.y,meeting?.10:video?-.06:0,k);
      tray.position.z=T.MathUtils.lerp(tray.position.z,meeting?.185:.17,k);
      const kAppear=reduced||first?1:1-Math.exp(-delta*APPEAR_RATE);
      mugShown=T.MathUtils.lerp(mugShown,next==='design'||meeting?1:0,kAppear);
      appear(coffee,mugShown,mugY);
      // Full at 06:00, nearly finished by noon; rewind naturally with the clock.
      const remaining=1-T.MathUtils.clamp((hour-6)/6,0,1);
      drink.position.y=T.MathUtils.lerp(drink.position.y,.033+.056*remaining,k);
      crema.position.y=drink.position.y+.0005;
      steam.position.y=drink.position.y+.008;
      coffee.position.x=T.MathUtils.lerp(coffee.position.x,meeting?MUG_LAST.x:.52,k);
      coffee.position.z=T.MathUtils.lerp(coffee.position.z,meeting?MUG_LAST.z:.20,k);
      // Coming out: carried over closed with the pen on it, the pen set aside,
      // the cover swung open, the pen put down on the page. Going back: the
      // same in reverse, and the book only leaves once it is shut.
      const angle=leaf.rotation.z,shut=angle<.02,wideOpen=angle>OPEN_ANGLE-.02;
      const spot=meeting||!shut?WRITING:STOWED;
      notebook.position.set(T.MathUtils.lerp(notebook.position.x,spot.x,k),T.MathUtils.lerp(notebook.position.y,spot.y,k),T.MathUtils.lerp(notebook.position.z,spot.z,k));
      notebook.rotation.y=T.MathUtils.lerp(notebook.rotation.y,spot.turn,k);
      const atDesk=Math.hypot(notebook.position.x-WRITING.x,notebook.position.z-WRITING.z)<SETTLED;
      const onCover={x:notebook.position.x,z:notebook.position.z,turn:notebook.rotation.y+Math.PI/2,y:notebook.position.y+CLOSED_TOP};
      const aside={x:notebook.position.x+.075,z:notebook.position.z+.01,turn:notebook.rotation.y+Math.PI/2,y:MAT};
      const onPage={x:notebook.position.x+.012,z:notebook.position.z+.008,turn:notebook.rotation.y-.6,y:notebook.position.y+OPEN_TOP};
      const penAt=meeting
        ?(!atDesk?onCover:wideOpen?onPage:aside)
        :(shut?onCover:aside);
      const kPen=Math.min(1,k*2);
      pen.position.set(T.MathUtils.lerp(pen.position.x,penAt.x,kPen),T.MathUtils.lerp(pen.position.y,penAt.y+PEN_RADIUS,kPen),T.MathUtils.lerp(pen.position.z,penAt.z,kPen));
      pen.rotation.y=T.MathUtils.lerp(pen.rotation.y,penAt.turn,kPen);
      // The cover only moves once the pen is clear of it.
      const penClear=Math.hypot(pen.position.x-aside.x,pen.position.z-aside.z)<SETTLED;
      const wantOpen=meeting&&atDesk&&(wideOpen||penClear);
      const wantShut=!meeting&&(shut||penClear);
      const target=wantOpen?OPEN_ANGLE:wantShut?0:angle;
      leaf.rotation.z=T.MathUtils.lerp(angle,target,reduced?1:1-Math.exp(-delta*OPEN_SPEED));
      staples.visible=leaf.rotation.z<.3;
      steam.visible=next==='design';
      const ringMaterial=ring.material as T.MeshBasicMaterial;
      ringMaterial.opacity=T.MathUtils.lerp(ringMaterial.opacity,next==='coding'||video?RING_OPACITY:0,kAppear);ring.visible=ringMaterial.opacity>.005;
      glassShown=T.MathUtils.lerp(glassShown,next==='coding'?1:0,kAppear);
      appear(glass,glassShown,glassY);
      first=false;
      chair.position.z=T.MathUtils.lerp(chair.position.z,sleep?.39:video?.59:.51,k);
      chair.rotation.y=T.MathUtils.lerp(chair.rotation.y,sleep?0:video?-.24:-.11,k);
      diffuser.material.emissiveIntensity=T.MathUtils.lerp(diffuser.material.emissiveIntensity,meeting&&darkness<.5?2.5:0,k);
      key.intensity=T.MathUtils.lerp(key.intensity,meeting?.8:0,k);led.visible=meeting;
      backlight.intensity=T.MathUtils.lerp(backlight.intensity,video?1.1:0,k);
      spill.intensity=T.MathUtils.lerp(spill.intensity,video?.35:sleep?0:.05,k);
    },
    dispose(){Object.values(textures).forEach(texture=>texture?.dispose());}
  };
}

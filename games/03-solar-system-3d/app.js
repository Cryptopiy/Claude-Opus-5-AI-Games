/* Compact realistic 3D Solar System — plain JS + Three.js (CDN) */
(() => {
'use strict';

/* ------------------------------------------------------------------ data */
const PLANETS = [
  { name:'Mercury', r:0.38, dist:16,  speed:1.60, spin:0.05, tilt:0.00,
    c1:0x9a8f86, c2:0x5b524c, rough:0.95, facts:[
      'Smallest planet and the closest to the Sun.',
      'A single day lasts about 59 Earth days.',
      'Surface swings between -180 °C and 430 °C.'] },
  { name:'Venus',   r:0.95, dist:23,  speed:1.17, spin:-0.02, tilt:2.64,
    c1:0xe6cba0, c2:0xa9793f, rough:0.75, facts:[
      'Hottest world in the Solar System, ~465 °C.',
      'Thick CO₂ clouds trap an extreme greenhouse.',
      'Rotates backwards compared to the others.'] },
  { name:'Earth',   r:1.00, dist:31,  speed:1.00, spin:0.60, tilt:0.41,
    c1:0x2a6fc4, c2:0x2f7a3f, rough:0.55, earth:true, facts:[
      'The only planet known to host life.',
      '71 % of the surface is covered by water.',
      'Its magnetic field deflects the solar wind.'] },
  { name:'Mars',    r:0.53, dist:40,  speed:0.80, spin:0.58, tilt:0.44,
    c1:0xc1583a, c2:0x76392a, rough:0.9, facts:[
      'Iron-oxide dust gives it a rusty red colour.',
      'Home of Olympus Mons, the tallest volcano.',
      'Has polar caps of water and dry ice.'] },
  { name:'Jupiter', r:3.20, dist:56,  speed:0.44, spin:1.45, tilt:0.05,
    c1:0xe0c9a6, c2:0x9b6b45, rough:0.6, bands:11, facts:[
      'Most massive planet — 318 Earth masses.',
      'The Great Red Spot is a centuries-old storm.',
      'Spins once in under 10 hours.'] },
  { name:'Saturn',  r:2.70, dist:72,  speed:0.32, spin:1.35, tilt:0.47,
    c1:0xe8d8ac, c2:0xb08f5c, rough:0.6, bands:8, ring:true, facts:[
      'Famous for its bright system of icy rings.',
      'Least dense planet — it would float on water.',
      'The rings span ~280,000 km but are thin.'] },
  { name:'Uranus',  r:1.30, dist:88,  speed:0.23, spin:-0.80, tilt:1.71,
    c1:0xa8e0e4, c2:0x5f9fb5, rough:0.45, facts:[
      'An ice giant of hydrogen, helium and methane.',
      'Tipped on its side, rotating at ~98°.',
      'Coldest atmosphere measured: -224 °C.'] },
  { name:'Neptune', r:1.26, dist:102, speed:0.18, spin:0.85, tilt:0.49,
    c1:0x4b6ede, c2:0x24357f, rough:0.45, facts:[
      'Farthest planet, 30 AU from the Sun.',
      'Supersonic winds reach 2,100 km/h.',
      'One orbit takes about 165 Earth years.'] }
];
const SUN_FACTS = [
  'Contains 99.86 % of the Solar System mass.',
  'Surface is roughly 5,500 °C.',
  'Light takes 8 min 20 s to reach Earth.'
];

/* -------------------------------------------------------- procedural tex */
const CV = (w,h) => { const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
const hex = n => '#'+n.toString(16).padStart(6,'0');
const tex = c => { const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding;
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=4; return t; };
const rnd = (a,b) => a+Math.random()*(b-a);

/* fBm-ish blobby noise painted with soft radial gradients */
function blobs(ctx,w,h,count,rMin,rMax,colors,alpha){
  for(let i=0;i<count;i++){
    const x=Math.random()*w, y=Math.random()*h, r=rnd(rMin,rMax);
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    const col=colors[(Math.random()*colors.length)|0];
    g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=alpha; ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(x,y,r,0,6.2832); ctx.fill();
  }
  ctx.globalAlpha=1;
}
function shade(n,f){ // lighten/darken hex int -> css
  const r=Math.min(255,((n>>16)&255)*f)|0, g=Math.min(255,((n>>8)&255)*f)|0, b=Math.min(255,(n&255)*f)|0;
  return `rgb(${r},${g},${b})`;
}

function planetTexture(p){
  const w=512,h=256,c=CV(w,h),x=c.getContext('2d');
  const grad=x.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,shade(p.c2,.75)); grad.addColorStop(.5,hex(p.c1)); grad.addColorStop(1,shade(p.c2,.7));
  x.fillStyle=grad; x.fillRect(0,0,w,h);

  if(p.bands){                                    // gas giants: latitude bands
    for(let i=0;i<p.bands;i++){
      const y=(i+.5)/p.bands*h, bh=h/p.bands*rnd(.5,1.05);
      x.globalAlpha=rnd(.18,.42);
      x.fillStyle= i%2 ? shade(p.c1,rnd(1.05,1.25)) : shade(p.c2,rnd(.7,1));
      x.beginPath();
      for(let sx=0;sx<=w;sx+=8){
        const wob=Math.sin(sx*.03+i)*bh*.16+Math.sin(sx*.011+i*2)*bh*.12;
        sx?x.lineTo(sx,y+wob-bh/2):x.moveTo(0,y+wob-bh/2);
      }
      for(let sx=w;sx>=0;sx-=8){
        const wob=Math.sin(sx*.026+i*1.7)*bh*.15;
        x.lineTo(sx,y+wob+bh/2);
      }
      x.closePath(); x.fill();
    }
    x.globalAlpha=1;
    blobs(x,w,h,26,8,26,[shade(p.c1,1.2),shade(p.c2,.75)],.22);
    if(p.name==='Jupiter'){                       // great red spot
      const g=x.createRadialGradient(w*.7,h*.62,2,w*.7,h*.62,26);
      g.addColorStop(0,'rgba(190,80,55,.95)'); g.addColorStop(1,'rgba(190,80,55,0)');
      x.fillStyle=g; x.save(); x.translate(w*.7,h*.62); x.scale(1,.55);
      x.beginPath(); x.arc(0,0,26,0,6.2832); x.fill(); x.restore();
    }
  } else if(p.earth){                             // continents + clouds
    blobs(x,w,h,10,26,64,['#1a4f8f','#123a6b'],.5);
    for(let i=0;i<9;i++){
      const cx=Math.random()*w, cy=rnd(h*.14,h*.86);
      x.fillStyle=Math.random()<.5?'#2f7a3f':'#3f7a44';
      x.globalAlpha=.92; x.beginPath();
      const pts=9,rad=rnd(16,44);
      for(let k=0;k<=pts;k++){
        const a=k/pts*6.2832, rr=rad*rnd(.45,1.15);
        const px=cx+Math.cos(a)*rr*1.5, py=cy+Math.sin(a)*rr*.7;
        k?x.lineTo(px,py):x.moveTo(px,py);
      }
      x.closePath(); x.fill();
    }
    x.globalAlpha=1;
    blobs(x,w,h,16,10,30,['#6b8f4a','#c9b98a','#2f6a3a'],.35);
    x.fillStyle='rgba(238,245,255,.9)';           // polar caps
    x.fillRect(0,0,w,10); x.fillRect(0,h-10,w,10);
    blobs(x,w,h,34,8,26,['rgba(255,255,255,.85)'],.3);
  } else {                                        // rocky worlds
    blobs(x,w,h,120,5,22,[shade(p.c1,1.22),shade(p.c2,.7),shade(p.c1,.85)],.3);
    x.globalAlpha=.35;                            // craters
    for(let i=0;i<90;i++){
      const cx=Math.random()*w, cy=Math.random()*h, r=rnd(1.5,7);
      x.strokeStyle=shade(p.c2,.6); x.lineWidth=1;
      x.beginPath(); x.arc(cx,cy,r,0,6.2832); x.stroke();
      x.fillStyle=shade(p.c1,1.12);
      x.beginPath(); x.arc(cx-r*.2,cy-r*.2,r*.7,0,6.2832); x.fill();
    }
    x.globalAlpha=1;
    if(p.name==='Mars'){ x.fillStyle='rgba(240,240,250,.75)';
      x.fillRect(0,0,w,7); x.fillRect(0,h-7,w,7); }
  }
  return tex(c);
}

function bumpTexture(){                           // shared subtle relief
  const w=256,h=128,c=CV(w,h),x=c.getContext('2d');
  x.fillStyle='#808080'; x.fillRect(0,0,w,h);
  blobs(x,w,h,220,3,16,['#ffffff','#111111'],.22);
  return tex(c);
}

function sunTexture(){
  const s=512,c=CV(s,s/2),x=c.getContext('2d');
  x.fillStyle='#ffb547'; x.fillRect(0,0,s,s/2);
  blobs(x,s,s/2,150,6,34,['#fff3c4','#ffd166','#ff8b25','#ffffff'],.4);
  return tex(c);
}

function ringTexture(){
  const s=512,c=CV(s,16),x=c.getContext('2d');
  for(let i=0;i<s;i++){
    const t=i/s;
    let a=.55+.35*Math.sin(t*70)+.2*Math.sin(t*23+1.4)+.12*Math.sin(t*160);
    if(t>.62&&t<.68) a*=.12;                      // Cassini division
    if(t<.06||t>.97) a*=.15;
    a=Math.max(0,Math.min(1,a));
    const l=190+55*Math.sin(t*40);
    x.fillStyle=`rgba(${l|0},${(l*.93)|0},${(l*.76)|0},${a.toFixed(3)})`;
    x.fillRect(i,0,1,16);
  }
  return tex(c);
}

function glowSprite(){
  const s=256,c=CV(s,s),x=c.getContext('2d');
  const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(255,240,200,.95)');
  g.addColorStop(.18,'rgba(255,190,90,.55)');
  g.addColorStop(.45,'rgba(255,140,40,.16)');
  g.addColorStop(1,'rgba(255,120,20,0)');
  x.fillStyle=g; x.fillRect(0,0,s,s);
  const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; return t;
}
function starSprite(){
  const s=64,c=CV(s,s),x=c.getContext('2d');
  const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(.3,'rgba(255,255,255,.5)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g; x.fillRect(0,0,s,s);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------- renderer */
const canvas=document.getElementById('scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
renderer.setSize(innerWidth,innerHeight);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,4000);
const HOME=new THREE.Vector3(0,46,116);
camera.position.copy(HOME);

const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.06;
controls.rotateSpeed=.5; controls.zoomSpeed=.85; controls.panSpeed=.5;
controls.minDistance=1.6; controls.maxDistance=520;

/* --------------------------------------------------------- star field */
(function stars(){
  const N=3600,pos=new Float32Array(N*3),col=new Float32Array(N*3),c=new THREE.Color();
  for(let i=0;i<N;i++){
    const u=Math.random()*2-1, a=Math.random()*6.2832, r=rnd(600,1500), s=Math.sqrt(1-u*u);
    pos[i*3]=Math.cos(a)*s*r; pos[i*3+1]=u*r*.75; pos[i*3+2]=Math.sin(a)*s*r;
    c.setHSL(rnd(.52,.68)*(Math.random()<.75?0:1)+ (Math.random()<.75?.09:0), rnd(.05,.5), rnd(.62,1));
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  scene.add(new THREE.Points(g,new THREE.PointsMaterial({
    size:3.2,map:starSprite(),vertexColors:true,transparent:true,
    depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true})));

  // faint milky band
  const M=900,mp=new Float32Array(M*3);
  for(let i=0;i<M;i++){
    const a=Math.random()*6.2832,r=rnd(700,1400);
    mp[i*3]=Math.cos(a)*r; mp[i*3+1]=rnd(-90,90); mp[i*3+2]=Math.sin(a)*r;
  }
  const mg=new THREE.BufferGeometry(); mg.setAttribute('position',new THREE.BufferAttribute(mp,3));
  scene.add(new THREE.Points(mg,new THREE.PointsMaterial({
    size:16,map:starSprite(),color:0x8ea6d8,transparent:true,opacity:.09,
    depthWrite:false,blending:THREE.AdditiveBlending})));
})();

/* ---------------------------------------------------------------- sun */
const sunGroup=new THREE.Group(); scene.add(sunGroup);
const sunMesh=new THREE.Mesh(
  new THREE.SphereGeometry(6,48,32),
  new THREE.MeshBasicMaterial({map:sunTexture()}));
sunGroup.add(sunMesh);

const halo=new THREE.Sprite(new THREE.SpriteMaterial({
  map:glowSprite(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
halo.scale.set(46,46,1); sunGroup.add(halo);
const halo2=halo.clone(); halo2.material=halo.material.clone();
halo2.material.opacity=.45; halo2.scale.set(110,110,1); sunGroup.add(halo2);

scene.add(new THREE.PointLight(0xfff0d0,2.4,900,1.4));
scene.add(new THREE.AmbientLight(0x2b3550,.22));
scene.add(new THREE.HemisphereLight(0x223, 0x0a0a12,.12));

/* ------------------------------------------------------------ planets */
const bump=bumpTexture(), ringMap=ringTexture(), bodies=[];

PLANETS.forEach(p=>{
  const orbit=new THREE.Group(); orbit.rotation.y=Math.random()*6.2832;
  orbit.rotation.x=(Math.random()-.5)*.045; scene.add(orbit);

  const holder=new THREE.Group(); holder.position.x=p.dist; orbit.add(holder);

  const mesh=new THREE.Mesh(
    new THREE.SphereGeometry(p.r,48,32),
    new THREE.MeshStandardMaterial({
      map:planetTexture(p), bumpMap:bump, bumpScale:p.bands?.006:.035,
      roughness:p.rough, metalness:.04 }));
  mesh.rotation.z=p.tilt; holder.add(mesh);

  if(p.earth){                                    // atmospheric fresnel shell
    const atm=new THREE.Mesh(new THREE.SphereGeometry(p.r*1.055,40,26),
      new THREE.ShaderMaterial({
        transparent:true, side:THREE.BackSide, depthWrite:false,
        blending:THREE.AdditiveBlending,
        uniforms:{ tint:{value:new THREE.Color(0x6fb0ff)} },
        vertexShader:`varying vec3 vN; varying vec3 vP;
          void main(){ vN=normalize(normalMatrix*normal);
            vec4 mv=modelViewMatrix*vec4(position,1.);
            vP=mv.xyz; gl_Position=projectionMatrix*mv; }`,
        fragmentShader:`uniform vec3 tint; varying vec3 vN; varying vec3 vP;
          void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(-vP))),2.4);
            gl_FragColor=vec4(tint,f*0.9); }`
      }));
    holder.add(atm);
  }

  if(p.ring){
    const rg=new THREE.RingGeometry(p.r*1.35,p.r*2.35,128,1);
    const uv=rg.attributes.uv, pos=rg.attributes.position, v=new THREE.Vector3();
    for(let i=0;i<pos.count;i++){                 // radial UVs for banding
      v.fromBufferAttribute(pos,i);
      const t=(v.length()-p.r*1.35)/(p.r*2.35-p.r*1.35);
      uv.setXY(i,t,i%2);
    }
    const ring=new THREE.Mesh(rg,new THREE.MeshStandardMaterial({
      map:ringMap,alphaMap:ringMap,transparent:true,side:THREE.DoubleSide,
      roughness:.85,metalness:0,depthWrite:false,opacity:.95}));
    ring.rotation.x=Math.PI/2; ring.rotation.y=0;
    const rw=new THREE.Group(); rw.rotation.z=p.tilt; rw.add(ring); holder.add(rw);
  }

  // orbit ring
  const seg=180,rp=new Float32Array((seg+1)*3);
  for(let i=0;i<=seg;i++){ const a=i/seg*6.2832;
    rp[i*3]=Math.cos(a)*p.dist; rp[i*3+1]=0; rp[i*3+2]=Math.sin(a)*p.dist; }
  const rgo=new THREE.BufferGeometry(); rgo.setAttribute('position',new THREE.BufferAttribute(rp,3));
  const line=new THREE.Line(rgo,new THREE.LineBasicMaterial({
    color:0x7f9fd0,transparent:true,opacity:.16}));
  orbit.add(line);

  bodies.push({...p,orbit,holder,mesh,line,angle:orbit.rotation.y});
});

/* -------------------------------------------------------------- UI */
const row=document.getElementById('planetRow');
const panel=document.getElementById('infoPanel');
const nameEl=document.getElementById('infoName');
const factsEl=document.getElementById('infoFacts');
const swatch=document.getElementById('infoSwatch');
const targets=[{name:'Sun',c1:0xffb547,facts:SUN_FACTS,obj:sunMesh,r:6}]
  .concat(bodies.map(b=>({name:b.name,c1:b.c1,facts:b.facts,obj:b.mesh,r:b.r})));

let selected=null, focus=null;
const buttons=targets.map((t,i)=>{
  const b=document.createElement('button');
  b.className='pbtn'; b.innerHTML=`<i style="color:${hex(t.c1)}"></i>${t.name}`;
  b.onclick=()=>select(i); row.appendChild(b); return b;
});

function select(i){
  selected=i; focus=targets[i];
  buttons.forEach((b,k)=>b.classList.toggle('active',k===i));
  nameEl.textContent=focus.name;
  swatch.style.background=hex(focus.c1); swatch.style.color=hex(focus.c1);
  factsEl.innerHTML=focus.facts.map(f=>`<li>${f}</li>`).join('');
  panel.classList.remove('hidden');
  bodies.forEach((b,k)=>{ b.line.material.opacity = (i-1===k)?.5:.16; });
}
document.getElementById('infoClose').onclick=()=>{
  panel.classList.add('hidden'); focus=null; selected=null;
  buttons.forEach(b=>b.classList.remove('active'));
  bodies.forEach(b=>b.line.material.opacity=.16);
};

let paused=false, speed=1;
const btnPause=document.getElementById('btnPause');
btnPause.onclick=()=>{ paused=!paused; btnPause.textContent=paused?'Resume':'Pause'; };
const sl=document.getElementById('speed'), sv=document.getElementById('speedVal');
sl.oninput=()=>{ speed=parseFloat(sl.value); sv.textContent=speed.toFixed(2)+'×'; };
document.getElementById('btnReset').onclick=()=>{
  focus=null; selected=null; panel.classList.add('hidden');
  buttons.forEach(b=>b.classList.remove('active'));
  bodies.forEach(b=>b.line.material.opacity=.16);
  camTarget.set(0,0,0); camPos.copy(HOME); flying=true;
};

/* ------------------------------------------------------------- camera */
const camTarget=new THREE.Vector3(0,0,0);
const camPos=HOME.clone();
const wp=new THREE.Vector3();
let flying=false;

/* --------------------------------------------------------------- loop */
const clock=new THREE.Clock();
let t=0;
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.05);
  if(!paused){
    t+=dt*speed;
    bodies.forEach(b=>{
      b.angle+=dt*speed*b.speed*.22;
      b.orbit.rotation.y=b.angle;
      b.mesh.rotation.y+=dt*speed*b.spin*.9;
    });
    sunMesh.rotation.y+=dt*speed*.03;
  }
  halo.material.rotation=t*.05;
  const pulse=1+Math.sin(t*.9)*.012;
  halo.scale.set(46*pulse,46*pulse,1);

  if(focus){
    focus.obj.getWorldPosition(wp);
    camTarget.lerp(wp,.08);
    const d=Math.max(focus.r*4.2,2.4);
    const dir=camera.position.clone().sub(controls.target);
    if(dir.lengthSq()<1e-6) dir.set(0,.4,1);
    dir.normalize().multiplyScalar(d); dir.y+=focus.r*.9;
    camPos.copy(wp).add(dir);
    camera.position.lerp(camPos,.055);
    controls.target.lerp(camTarget,.08);
  } else if(flying){
    camera.position.lerp(camPos,.07);
    controls.target.lerp(camTarget,.07);
    if(camera.position.distanceTo(camPos)<.6) flying=false;
  }
  controls.update();
  renderer.render(scene,camera);
}
animate();

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});

const ld=document.getElementById('loader');
setTimeout(()=>{ ld.classList.add('gone'); select(3); },400);
})();

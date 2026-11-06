/* Whole-house overview: stationary hit planes, independently animated room groups.
   Цвета, свет и статусы — ui/room3d-theme.js: пол комнаты подкрашивается по её статусу, критичное пульсирует. */
window.IGIH=window.IGIH||{};
IGIH.house3d=(()=>{
  let libraries;
  /** opts.floor — какой этаж показать (по умолчанию текущий); opts.fit — запас по краям (1 — как на плане дома, больше — дом мельче); opts.shiftY — сдвиг картинки вниз (доля). Для миниатюры на главном экране. */
  function create(object,initialLevels,onRoom,opts={}){
    const host=document.createElement('div');host.className='scene scene-house house-3d';
    const message=document.createElement('div');message.className='three-message';message.textContent='Подготовка плана дома…';host.append(message);
    let disposed=false,cleanup=()=>{},levels=initialLevels;
    host.dispose=()=>{disposed=true;cleanup();};
    libraries ||= Promise.all([import('./three.module.js'),import('./RoundedBoxGeometry.js')]);
    libraries.then(([T,{RoundedBoxGeometry}])=>{
      if(disposed)return;
      let renderer;
      try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}
      catch{message.textContent='Объёмный план недоступен. Выберите обычный вид.';return;}
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
      renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
      host.replaceChildren(renderer.domElement);
      const labelLayer=document.createElement('div');labelLayer.className='house-labels';host.append(labelLayer);
      const scene=new T.Scene(),rooms=object.rooms,records=new Map(),hitPlanes=[],meshes=[];
      const width=Math.max(...rooms.map(r=>r.x+r.w)),depth=Math.max(...rooms.map(r=>r.y+r.d));
      const camera=new T.OrthographicCamera(-10,10,10,-10,.1,100);
      const R0=Math.hypot(16,18,20),AZ0=Math.atan2(16,20),EL0=Math.atan2(18,Math.hypot(16,20));let az=AZ0,el=EL0;
      const aim=()=>{camera.position.set(width/2+R0*Math.cos(el)*Math.sin(az),R0*Math.sin(el),depth/2+R0*Math.cos(el)*Math.cos(az));camera.lookAt(width/2,.35,depth/2);};aim();
      const th=IGIH.room3dTheme(T),mat=th.mat;
      const palette={wood:mat('#a58b6b'),walnut:mat('#665447'),fabric:mat('#697d79'),cushion:mat('#bdb7a8'),dark:mat('#263235'),steel:mat('#a1aaa5',.3,.65),ceramics:mat('#b5a38b'),plaster:mat('#d4d3c9',.8,0,{},{role:'wall'})};
      for(const r of rooms){
        const group=new T.Group();group.position.set(r.x+r.w/2,0,r.y+r.d/2);scene.add(group);
        const roomMeshes=[];
        function mesh(geometry,material,x,y,z){const n=new T.Mesh(geometry,material);n.position.set(x,y,z);n.castShadow=true;n.receiveShadow=true;group.add(n);meshes.push(n);roomMeshes.push(n);return n;}
        const box=(x,y,z,w,h,d,m,rad=.015)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(rad,w/3,h/3,d/3)),m,x,y,z);
        const cylinder=(x,y,z,rt,rb,h,m)=>mesh(new T.CylinderGeometry(rt,rb,h,24),m,x,y,z);
        const sphere=(x,y,z,sx,sy,sz,m)=>{const n=mesh(new T.SphereGeometry(1,16,10),m,x,y,z);n.scale.set(sx,sy,sz);return n;};
        box(0,-.11,0,r.w,.20,r.d,mat('#7c8585',.8,0,{},{role:'edge'}),.025);
        const wall=mat('#d4d3c9',.8,0,{},{role:'wall',tint:r.tint});
        const wood=r.floor==='wood',slab=r.floor==='concrete'?Math.max(1.5,Math.max(r.w,r.d)/8):.6,cols=Math.ceil(r.w/(wood?1.25:slab)),rows=Math.ceil(r.d/(wood?.38:slab));
        for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
          const jitter=((i*3+j*7)%5-2)*.008,m=wood?th.track(palette.wood.clone(),jitter):th.track(mat(r.floor==='tile'?'#b9c1bf':r.floor==='concrete'?'#a7a9a6':'#c1b8a6',.8,0,{},{role:'floor'}),jitter);
          box(-r.w/2+r.w*(i+.5)/cols,.005,-r.d/2+r.d*(j+.5)/rows,r.w/cols-.008,.025,r.d/rows-.008,m,.002);
        }
        // низкие стены (задняя и левая) с проёмами дверей
        for(const side of ['x','y']){
          const len=side==='x'?r.w:r.d,gaps=r.items.filter(it=>it.draw==='door'&&it.wall===side).map(it=>[it[side],it[side]+it.w]).sort((a,b)=>a[0]-b[0]);
          let from=-.05;
          for(const [g0,g1] of [...gaps,[len+.05,len+.05]]){
            if(g0-from>.02){const c=(from+g0)/2,l=g0-from;side==='x'?box(c-r.w/2,.25,-r.d/2,l,.5,.10,wall):box(-r.w/2,.25,c-r.d/2,.10,.5,l,wall);}
            if(g1>g0)side==='x'?box((g0+g1)/2-r.w/2,.012,-r.d/2,g1-g0,.024,.12,palette.walnut):box(-r.w/2,.012,(g0+g1)/2-r.d/2,.12,.024,g1-g0,palette.walnut);
            from=g1;
          }
        }
        // подкраска пола по статусу комнаты
        const tint=new T.Mesh(th.own(new T.PlaneGeometry(r.w-.04,r.d-.04)),th.own(new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})));
        tint.rotation.x=-Math.PI/2;tint.position.y=.022;tint.renderOrder=4;group.add(tint);
        // Cutaway walls keep the overview readable; equipment cards remain in the room view.
        const items=r.items.filter(it=>!it.wall && it.draw!=='cabinets').map(it=>it.draw==='pipe'?{...it,h:.35}:it);
        const model=IGIH.room3dModels({...r,items,h:r.id==='boiler'?1.95:r.h},{T,theme:th,overview:true,wallMat:wall,badgeSize:.42,scene:group,box,cylinder,sphere,mesh,mat,meshes:roomMeshes,picks:[],...palette});
        const hit=new T.Mesh(new T.PlaneGeometry(r.w,r.d),new T.MeshBasicMaterial());
        hit.rotation.x=-Math.PI/2;hit.position.set(r.x+r.w/2,.025,r.y+r.d/2);hit.updateMatrixWorld(true);hit.userData.id=r.id;hitPlanes.push(hit);
        const button=document.createElement('button');button.className='house-room-label';button.dataset.room=r.id;
        const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');const text=document.createElement('span');text.textContent=r.name;button.append(dot,text);
        button.onclick=e=>{e.stopPropagation();onRoom(r.id);};
        button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))activate(r.id);});
        button.addEventListener('blur',()=>{if(!host.matches(':hover'))activate(null);});
        labelLayer.append(button);
        records.set(r.id,{group,model,button,dot,tint,level:'none',from:0,to:0,start:0,anchor:new T.Vector3(r.x+r.w/2,.1,r.y+r.d*.65)});
      }
      const hemi=new T.HemisphereLight('#eef4ff','#9d927f',2.2);scene.add(hemi);
      const sun=new T.DirectionalLight('#fff2da',3.2);sun.position.set(width/2+3,16,depth/2+5);sun.target.position.set(width/2,0,depth/2);sun.castShadow=true;
      sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:40});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun,sun.target);
      let active=null,frame=0,ready=false;
      const reduce=matchMedia('(prefers-reduced-motion: reduce)');
      function placeLabels(){for(const rec of records.values()){const p=rec.anchor.clone();p.y+=rec.group.position.y;p.project(camera);rec.button.style.left=(p.x*.5+.5)*host.clientWidth+'px';rec.button.style.top=(-p.y*.5+.5)*host.clientHeight+'px';}}
      function render(){if(disposed||!ready)return;scene.updateMatrixWorld(true);renderer.render(scene,camera);placeLabels();}
      function tick(now){
        frame=0;if(disposed)return;let moving=false;
        for(const rec of records.values()){
          const t=reduce.matches?1:Math.min(1,Math.max(0,(now-rec.start)/236));const ease=1-Math.pow(1-t,3);
          rec.group.position.y=rec.from+(rec.to-rec.from)*ease;if(t<1&&rec.from!==rec.to)moving=true;
        }
        if(pulse(now))moving=true;
        render();if(moving)frame=requestAnimationFrame(tick);
      }
      function activate(id){
        if(id===active||disposed)return;
        const now=performance.now();
        for(const key of [active,id]){const rec=records.get(key);if(!rec)continue;rec.from=rec.group.position.y;rec.to=key===id?.22:0;rec.start=now;rec.button.classList.toggle('is-hover',key===id);}
        active=id;if(!frame)frame=requestAnimationFrame(tick);
      }
      const ray=new T.Raycaster(),pointer=new T.Vector2();
      function roomAt(e){const label=e.target.closest?.('[data-room]');if(label&&records.has(label.dataset.room))return label.dataset.room;
        const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(hitPlanes,false)[0]?.object.userData.id||null;}
      host.addEventListener('pointermove',e=>{const id=roomAt(e);activate(id);renderer.domElement.style.cursor=id?'pointer':'default';});
      host.addEventListener('pointerleave',()=>activate(null));
      renderer.domElement.addEventListener('click',e=>{if(dragged)return;const id=roomAt(e);if(id)onRoom(id);});
      // вращение: перетаскивание мышью или пальцем; пока не трогали — дом медленно покачивается
      let drag=null,dragged=false,touched=false,swing=0,visible=true,t0=performance.now();
      const cv=renderer.domElement;cv.style.touchAction='pan-y';
      cv.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,az,el,id:e.pointerId};dragged=false;});
      addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(!dragged&&Math.abs(dx)+Math.abs(dy)<6)return;
        if(!dragged){dragged=true;touched=true;host.classList.add('is-drag');try{cv.setPointerCapture(e.pointerId);}catch{}activate(null);}
        az=drag.az-dx*.009;el=Math.min(1.15,Math.max(.42,drag.el+dy*.006));aim();render();});
      const up=()=>{if(!drag)return;drag=null;host.classList.remove('is-drag');setTimeout(()=>dragged=false,0);};
      addEventListener('pointerup',up);addEventListener('pointercancel',up);
      host.turn=(a)=>{touched=true;const from=az,start=performance.now();const step=now=>{const k=Math.min(1,(now-start)/600),e2=1-Math.pow(1-k,3);az=from+a*e2;aim();render();if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);};
      host.reset=()=>{touched=true;const fa=az,fe=el,start=performance.now();const da=((AZ0-fa)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI;
        const step=now=>{const k=Math.min(1,(now-start)/700),e2=1-Math.pow(1-k,3);az=fa+da*e2;el=fe+(EL0-fe)*e2;aim();render();if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);};
      const sway=now=>{swing=0;if(disposed||touched||!visible||reduce.matches)return;az=AZ0+.5*Math.sin((now-t0)/4200);aim();render();swing=requestAnimationFrame(sway);};
      new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&!swing)swing=requestAnimationFrame(sway);}).observe(host);
      /** Подкраска пола и пульс приборов; true — нужны ещё кадры. */
      function pulse(now){
        let alive=false;
        for(const rec of records.values()){
          if(rec.model.pulse(now))alive=true;
          const g=th.glow(rec.level,now);
          rec.tint.material.opacity={crit:.38+g*.6,warn:.5,info:.18,ok:.07}[rec.level]||0;
          if(rec.level==='crit'&&!th.reduce.matches)alive=true;
        }
        return alive;
      }
      host.updateState=next=>{
        levels=next;th.apply();th.mood({hemi,sun,renderer},!!IGIH.toys.state.ambient);
        for(const [id,rec] of records){
          rec.level=levels?.rooms?.[id]||'none';rec.model.update(levels);
          rec.tint.material.color.copy(th.alarm(rec.level));
          rec.dot.style.background=`var(--st-${rec.level})`;
          rec.button.className='house-room-label st-'+rec.level+(active===id?' is-hover':'');
        }
        render();if(!frame)frame=requestAnimationFrame(tick);
      };
      const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
        const aspect=w/h,half=Math.max((width+depth)*.24,(width+depth)*.39/aspect)*(opts.fit||1);camera.left=-half*aspect;camera.right=half*aspect;const sy=opts.shiftY||0;camera.top=half*(1+sy);camera.bottom=-half*(1-sy);camera.updateProjectionMatrix();renderer.setSize(w,h,false);ready=true;render();};
      const observer=new ResizeObserver(resize);observer.observe(host);
      const states=new MutationObserver(()=>host.updateState(levels));states.observe(document.documentElement,{attributes:true,attributeFilter:['class','data-palette']});
      cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();states.disconnect();const geometry=new Set(),materials=new Set();for(const n of [...meshes,...hitPlanes]){geometry.add(n.geometry);materials.add(n.material);}geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());th.dispose();sun.shadow.map?.dispose();renderer.dispose();renderer.forceContextLoss();};
      host.updateState(levels);resize();
    }).catch(()=>{if(!disposed)message.textContent='Не удалось подготовить объёмный план. Выберите обычный вид.';});
    return host;
  }
  return {create};
})();

/* Shared dimensional models for the architectural room views. Metres, Y up.
   Статусы приборов (значок, круг на полу, подсветка и контур корпуса) и цвета — через k.theme (ui/room3d-theme.js).
   Тревога в комнате видна светом: «внимание» — оранжевый, медленно «дышит»; «критично» — красный, пульсирует чаще. */
window.IGIH = window.IGIH || {};
IGIH.room3dModels = (r,k) => {
  const {T,scene,box,cylinder,sphere,mesh,mat,meshes,picks,wood,walnut,fabric,cushion,dark,steel,ceramics,plaster}=k;
  const white=mat('#dce1dd',.55), stone=mat('#b9b8ac',.6), glass=mat('#526d78',.16,.25);
  const red=mat('#955447',.45), brass=mat('#a29260',.4,.55), blue=mat('#526e7e',.4,.25);
  const graphite=mat('#454b4f',.55,.08), matte=mat('#e3e0d8',.75), quartz=mat('#d8d5cd',.35), oak=mat('#c4a57c',.7);   // квартира: графит, матовые фасады, кварц
  const monitors=[],lampMaterials=[],lights=[];
  let car=null;   // машина в гараже — ui/car3d.js
  let tv=null;    // экран телевизора — canvas-текстура
  const X=x=>x-r.w/2,Z=y=>y-r.d/2;
  const at=(it)=>[X(it.x||0),Z(it.y||0)];
  const A=(it)=>it.wall==='y'?it.y:it.x;   // место настенного вдоль своей стены
  function frontDisc(x,y,z,r,material,depth=.02){const n=cylinder(x,y,z,r,r,depth,material);n.rotation.x=Math.PI/2;return n;}
  function pipeBetween(a,b,radius,material){const delta=new T.Vector3(...b).sub(new T.Vector3(...a));const n=cylinder((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,radius,radius,delta.length(),material);n.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return n;}
  function handle(x,y,z,w=.22){box(x,y,z,w,.025,.035,steel,.012);}
  function lamp(x,y,z){
    cylinder(x,y+.025,z,.11,.12,.05,dark);cylinder(x,y+.16,z,.012,.012,.28,steel);
    const m=mat('#d3c5a8',.9,0,{side:T.DoubleSide,emissive:'#ffd29a',emissiveIntensity:0});
    const n=mesh(new T.CylinderGeometry(.10,.15,.22,32,1,true),m,x,y+.35,z);lampMaterials.push(m);
    const light=new T.PointLight('#ffcf99',0,4,2);light.position.set(x,y+.26,z);scene.add(light);lights.push(light);
    n.userData.action='ambient';picks.push(n);
  }
  function plant(x,y,z,s=.6){
    cylinder(x,y+.14*s,z,.13*s,.095*s,.28*s,ceramics);
    for(let i=0;i<9;i++){const a=i*2.4;const leaf=sphere(x+Math.cos(a)*.16*s,y+(.45+i%3*.10)*s,z+Math.sin(a)*.16*s,.055*s,.18*s,.035*s,mat('#617453'));leaf.rotation.z=Math.sin(a)*.6;leaf.rotation.y=a;}
  }
  // Real wall-mounted thickness, with local horizontal coordinates on either wall.
  function wallBox(it,a,z,w,h,d,material){return it.wall==='y'?box(-r.w/2+d/2,z+h/2,Z(a+w/2),d,h,w,material,.014):box(X(a+w/2),z+h/2,-r.d/2+d/2,w,h,d,material,.014);}
  // Склад: стеллажи и паллеты — простые коробки, собранные в одну геометрию на материал (несколько мешей вместо тысяч)
  const batch=new Map();
  function flatBox(x,y,z,w,h,d,material){(batch.get(material)||batch.set(material,[]).get(material)).push([x,y,z,w,h,d]);}
  function flushBatch(){
    if(!batch.size)return;
    const unit=new T.BoxGeometry(1,1,1),P=unit.attributes.position.array,N=unit.attributes.normal.array,I=unit.index.array,v=P.length/3;
    for(const [material,list] of batch){
      const pos=new Float32Array(list.length*P.length),nor=new Float32Array(list.length*N.length),idx=new Uint32Array(list.length*I.length);
      list.forEach(([x,y,z,w,h,d],b)=>{
        for(let i=0;i<v;i++){pos[b*P.length+i*3]=P[i*3]*w+x;pos[b*P.length+i*3+1]=P[i*3+1]*h+y;pos[b*P.length+i*3+2]=P[i*3+2]*d+z;}
        nor.set(N,b*N.length);for(let i=0;i<I.length;i++)idx[b*I.length+i]=I[i]+b*v;
      });
      const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setIndex(new T.BufferAttribute(idx,1));
      mesh(g,material,0,0,0);
    }
    unit.dispose();batch.clear();
  }
  let WH=null;   // материалы склада — одни на все стеллажи
  const wh=()=>WH||={post:mat('#2f5d8a',.5,.3),beam:mat('#d9772b',.45,.2),pal:mat('#b48a5a',.85),
    loads:[mat('#c29a63',.9),mat('#dfe3e2',.4,.05),mat('#4f7da1',.6)]};
  function model(it) {
    const [x,z]=at(it),w=it.w||.5,d=it.d||.4,h=it.h||.5;
    switch(it.draw){
      case 'boiler': {
        box(x+w/2,.07,z+d/2,w-.07,.14,d-.06,dark);
        box(x+w/2,h/2+.07,z+d/2,w,h-.14,d,blue,.07);
        box(x+w/2,h*.53,z+d+.012,w-.14,h*.70,.035,blue,.03);
        box(x+w*.36,h-.18,z+d+.04,.33,.14,.035,dark,.012);
        for(let i=0;i<3;i++)frontDisc(x+w*.65+i*.12,h-.18,z+d+.06,.029,steel);
        box(x+w*.48,.48,z+d+.19,.53,.43,.36,dark,.065);
        box(x+w*.48,.48,z+d+.40,.44,.36,.09,red,.05);
        frontDisc(x+w*.48,.48,z+d+.46,.13,steel);frontDisc(x+w*.48,.48,z+d+.48,.10,dark);
        for(let i=-2;i<=2;i++)box(x+w*.48,.48+i*.033,z+d+.50,.17,.01,.01,steel,.003);
        for(const a of [x+.12,x+w-.12])for(const b of [.25,h-.30])frontDisc(a,b,z+d+.04,.012,steel);
        break;
      }
      case 'pipe': {
        const start=it.z,top=r.h;
        cylinder(x,(start+top)/2,z,it.r,it.r,top-start,steel);
        for(let y=start+.12;y<top;y+=.42)cylinder(x,y,z,it.r+.013,it.r+.013,.035,dark);
        pipeBetween([x+it.r,start+.24,z],[x+it.r+.20,start+.24,z],.022,steel);break;
      }
      case 'node': {
        wallBox(it,it.x-.03,it.z-.03,w+.06,h+.06,.035,steel);
        wallBox(it,it.x,it.z,w,h,.12,white);
        wallBox(it,it.x+.06,it.z+.10,w-.12,h-.17,.135,dark);
        for(let i=0;i<3;i++){
          const xx=X(it.x+.08+i*.13);
          cylinder(xx,it.z-.03,-r.d/2+.08,.023,.023,.08,dark);
          pipeBetween([xx,it.z-.06,-r.d/2+.08],[xx,it.z-.28,-r.d/2+.06],.008,dark);
        }break;
      }
      case 'vent': {
        const a=it.y??it.x;wallBox(it,a,it.z,w,h,.055,white);
        for(let i=1;i<6;i++)wallBox(it,a+.035,it.z+i*h/7,w-.07,.014,.075,dark);break;
      }
      case 'valve': {
        const a=it.y??it.x;
        pipeBetween([-r.w/2+.09,.18,Z(a+w/2)],[-r.w/2+.09,it.z+h+.32,Z(a+w/2)],.028,brass);
        wallBox(it,a,it.z,w,h,.16,brass);wallBox(it,a+.05,it.z+h*.6,w-.10,h*.38,.22,dark);break;
      }
      case 'outdoor': {
        wallBox(it,it.x,it.z,w,h,.10,white);
        for(let i=0;i<4;i++)wallBox(it,it.x+.035,it.z+.035+i*.04,w-.07,.012,.115,steel);break;
      }
      case 'extinguisher': cylinder(x,.25,z,.085,.085,.5,red);cylinder(x,.53,z,.025,.025,.07,dark);pipeBetween([x,.55,z],[x+.11,.52,z],.012,dark);break;
      case 'cabinet':case 'wardrobe':case 'cabinets': {
        const y=it.z||0, material=it.m==='graphite'?graphite:it.built?matte:it.draw==='cabinet'?(it.m==='red'?red:steel):wood;
        box(x+w/2,y+h/2,z+d/2,w,h,d,material,.018);
        const n=it.draw==='wardrobe'?(it.built?Math.max(2,Math.round(w/.5)):2):(it.n||2);
        for(let i=0;i<n;i++){
          box(x+w*(i+.5)/n,y+h/2,z+d+.007,w/n-.012,h-.04,.018,material,.008);
          if(it.built)box(x+w*(i+.5)/n+(i%2?-1:1)*(w/n/2-.05),y+h*.5,z+d+.03,.012,.6,.02,brass,.004);   // тонкие латунные ручки-профили
          else if(it.draw==='wardrobe')box(x+w*(i+.5)/n,y+h*.53,z+d+.035,.022,.27,.03,dark,.008);
          else handle(x+w*(i+.5)/n,y+.12,z+d+.04,Math.min(.22,w/n*.6));
        }break;
      }
      case 'counter': {
        box(x+w/2,.05,z+d/2,w-.08,.10,d-.06,dark);
        const front=it.m==='graphite'?graphite:white;
        box(x+w/2,(h-.06)/2+.07,z+d/2,w,h-.14,d,front);
        box(x+w/2,h-.02,z+d/2,w+.035,.045,d+.03,it.m==='graphite'?quartz:stone,.014);
        const n=Math.max(1,Math.round(w/.5));for(let i=0;i<n;i++){
          box(x+w*(i+.5)/n,h/2,z+d+.006,w/n-.014,h-.16,.016,front,.005);
          if(it.m==='graphite')box(x+w*(i+.5)/n,h-.11,z+d+.02,w/n*.6,.012,.02,brass,.004);else handle(x+w*(i+.5)/n,h-.15,z+d+.03,w/n*.5);
        }
        if(it.sink){
          const cx=x+w*it.sink,cz=z+d*.5;
          box(cx,h+.005,cz,.38,.018,.30,steel,.08);box(cx,h+.015,cz,.31,.02,.23,dark,.065);
          pipeBetween([cx,h,cz-.17],[cx,h+.24,cz-.17],.016,steel);pipeBetween([cx,h+.24,cz-.17],[cx,h+.24,cz],.016,steel);
        }break;
      }
      case 'stove': {
        if(it.induction){
          box(x+w/2,(h-.06)/2+.07,z+d/2,w,h-.14,d,graphite);box(x+w/2,.05,z+d/2,w-.08,.10,d-.06,dark);
          box(x+w/2,h-.02,z+d/2,w+.02,.045,d+.03,quartz,.014);box(x+w/2,h+.008,z+d/2,w-.06,.012,d-.08,mat('#16191b',.15,.2),.01);
          for(const [ax,az,rr] of [[.3,.3,.09],[.7,.3,.07],[.3,.7,.07],[.7,.7,.09]]){const ring=mesh(new T.TorusGeometry(rr,.004,6,32),mat('#6f7579',.4),x+w*ax,h+.016,z+d*az);ring.rotation.x=Math.PI/2;}
          box(x+w/2,.42,z+d+.008,w-.08,.46,.02,mat('#1d2124',.15,.25),.01);box(x+w/2,.7,z+d+.03,w-.16,.02,.02,steel,.005);break;
        }
        box(x+w/2,h/2,z+d/2,w,h,d,white,.025);box(x+w/2,h+.005,z+d/2,w-.035,.025,d-.035,dark);
        for(const ax of [.25,.75])for(const az of [.25,.75]){
          cylinder(x+w*ax,h+.028,z+d*az,.08,.08,.018,steel);
          box(x+w*ax,h+.045,z+d*az,.20,.016,.017,dark);box(x+w*ax,h+.045,z+d*az,.017,.016,.20,dark);
        }
        box(x+w/2,.37,z+d+.009,w-.10,.43,.025,glass,.02);handle(x+w/2,.62,z+d+.045,w-.15);
        for(let i=0;i<4;i++)frontDisc(x+.10+i*.13,h-.09,z+d+.03,.026,dark);
        cylinder(x+w*.75,h+.12,z+d*.25,.115,.105,.20,steel);cylinder(x+w*.75,h+.225,z+d*.25,.12,.12,.015,steel);break;
      }
      case 'fridge': {
        if(it.built){box(x+w/2,h/2,z+d/2,w,h,d,graphite,.02);box(x+w/2,1.25,z+d+.006,w-.02,.008,.012,dark);
          box(x+.06,1.0,z+d+.02,.012,.5,.02,brass,.004);box(x+.06,1.6,z+d+.02,.012,.3,.02,brass,.004);break;}
        box(x+w/2,h/2,z+d/2,w,h,d,steel,.035);
        for(const [yy,hh] of [[.58,1.12],[1.50,.64]])box(x+w/2,yy,z+d+.01,w-.025,hh,.035,white,.018);
        for(const y of [.90,1.43])box(x+w-.08,y,z+d+.07,.026,.27,.035,steel,.01);break;
      }
      case 'table': {
        for(const ax of [.08,.92])for(const az of [.1,.9])cylinder(x+w*ax,h/2,z+d*az,.025,.018,h,walnut);
        box(x+w/2,h,z+d/2,w,.055,d,wood,.08);
        if(it.plant)plant(x+w/2,h+.03,z+d/2,.45);break;
      }
      case 'chair': {
        for(const ax of [.05,.35])for(const az of [.05,.35])cylinder(x+ax,.22,z+az,.014,.014,.44,dark);
        box(x+.20,.45,z+.20,.42,.075,.42,fabric,.04);const back=box(x+.20,.70,z+.035,.42,.48,.07,fabric,.06);back.rotation.x=-.08;break;
      }
      case 'sofa': {
        for(const ax of [.12,w-.12])for(const az of [.10,d-.10])cylinder(x+ax,.10,z+az,.025,.025,.18,dark);
        box(x+w/2,.30,z+d/2,w,.25,d,fabric,.08);
        box(x+w/2,.67,z+d-.10,w,.65,.22,fabric,.09);
        for(const ax of [.10,w-.10])box(x+ax,.52,z+d/2,.22,.54,d,fabric,.09);
        for(const ax of [.28,.72])box(x+w*ax,.48,z+d*.43,w*.40,.18,d*.72,fabric,.07);
        for(const ax of [.25,.75])box(x+w*ax,.72,z+d-.28,.42,.40,.16,cushion,.07);
        if(it.corner){box(x+.43,.30,z-.32,.86,.25,.86,fabric,.08);box(x+.43,.47,z-.32,.78,.12,.8,fabric,.07);
          for(const az of [-.68,.02])cylinder(x+.12,.10,z+az,.025,.025,.18,dark);}
        break;
      }
      case 'stand': {
        const y0=it.low?.22:0;   // low — подвесная, над полом
        box(x+w/2,y0+h/2,z+d/2,w,h,d,walnut,.025);
        for(let i=0;i<3;i++)box(x+w*(i+.5)/3,y0+h/2,z+d+.01,w/3-.014,h-.06,.02,it.low?oak:walnut,.007);
        if(it.low){plant(x+w-.25,y0+h,z+d/2,.32);break;}
        plant(x+w-.25,h,z+d/2,.32);break;
      }
      case 'floorlamp':lamp(x,1.1,z);cylinder(x,.55,z,.015,.015,1.1,steel);cylinder(x,.03,z,.15,.16,.06,dark);break;
      case 'tv': {          // телевизор: при включении — заставка IGIH, затем слайды (ui/tv-slides.js); кадры идут через pulse()
        wallBox(it,A(it),it.z,w,h,.07,dark);
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=288;
        const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
        const screen=mat('#10191c',.23,.15,{emissive:'#7c9d9c',emissiveIntensity:0});
        wallBox(it,A(it)+.035,it.z+.035,w-.07,h-.07,.085,screen);
        const logo=new Image();logo.src='assets/logo-256.png';
        tv={canvas,ctx:canvas.getContext('2d'),map,screen,logo,on:false,t0:0,last:0};
        break;
      }
      case 'rug':box(x+w/2,.04,z+d/2,w,.025,d,mat('#a7a69b'),.04);break;
      case 'bed': {
        box(x+w/2,.19,z+d/2,w,.28,d,it.modern?oak:walnut,.045);
        if(it.modern){const hb=mat(it.kid?'#9fb09a':'#8e9a94',.95);box(x+w/2,.68,z+.06,w+.3,1.2,.1,hb,.04);
          for(let i=1;i<Math.round((w+.3)/.25);i++)box(x-.15+i*.25,.68,z+.115,.012,1.1,.012,mat('#7a8580',.95),.003);}
        else box(x+w/2,.65,z+.055,w+.05,1.12,.12,fabric,.06);
        box(x+w/2,.41,z+d/2+.02,w-.04,.24,d-.08,white,.11);
        box(x+w/2,.55,z+d*.66,w+.025,.14,d*.63,mat('#7f9190'),.08);
        box(x+w/2,.63,z+d*.40,w-.04,.05,.24,cushion,.035);
        for(const ax of [.25,.75]){const p=box(x+w*ax,.59,z+.35,w*.43,.16,.48,cushion,.09);p.rotation.x=-.08;}
        break;
      }
      case 'nightstand': {
        box(x+w/2,h/2,z+d/2,w,h,d,walnut,.025);box(x+w/2,h*.70,z+d+.012,w-.035,h*.43,.025,walnut,.012);handle(x+w/2,h*.74,z+d+.04,.16);lamp(x+w/2,h,z+d/2);break;
      }
      case 'radiator': {
        const a=it.x??it.y;for(let i=0;i<Math.round(w/.09);i++)wallBox(it,a+i*.09,it.z,.065,h,.12,white);break;
      }
      case 'bath': {
        // Rounded shell, inner bowl and rim instead of a solid rectangular block.
        box(x+w/2,h/2,z+d/2,w,h,d,white,.20);
        box(x+w/2,h+.005,z+d/2,w-.13,.025,d-.13,stone,.18);
        box(x+w/2,h+.022,z+d/2,w-.25,.018,d-.23,mat('#8dabb0',.2,.1),.16);
        pipeBetween([x+.15,h,z+d*.5],[x+.15,h+.25,z+d*.5],.02,steel);pipeBetween([x+.15,h+.25,z+d*.5],[x+.31,h+.25,z+d*.5],.02,steel);break;
      }
      case 'stairs': {      // марш вдоль задней стены: ступени-блоки, светлые проступи, стойки и поручень (на плане дома — срезан)
        if(it.well){      // верхний этаж: проём, в нём видны верхние ступени марша снизу; ограждение по краю
          box(x+w/2,.02,z+d/2,w,.03,d,mat('#2e2924',.9,0),.004);
          ['#b89a74','#8f775a','#6b5a45','#4d4134'].forEach((c,i)=>box(x+w-.2-i*.28,.04,z+d/2,.26,.012,d-.06,mat(c,.7,0),.004));
          const R=k.overview?.5:.9;
          for(let t=.05;t<=w;t+=.25)cylinder(x+t,R/2,z+d+.02,.012,.012,R,dark);
          box(x+w/2,R,z+d+.02,w,.04,.05,walnut,.01);break;
        }
        const H=k.overview?Math.min(h,1):h,n=Math.round(h/.2),run=w/n,rise=h/n;
        for(let i=0;i<n;i++){const y=(i+1)*rise;if(y>H+1e-6)break;
          box(x+run*(i+.5),y/2,z+d/2,run+.002,y,d,walnut,.006);box(x+run*(i+.5),y+.012,z+d/2+.01,run+.02,.025,d+.02,wood,.006);}
        for(let i=0;i<n;i+=3){const y=Math.min(H,(i+1)*rise);cylinder(x+run*(i+.5),y+.45,z+d-.05,.018,.018,.9,dark);}
        if(!k.overview)pipeBetween([x+run*.5,rise+.9,z+d-.05],[x+w-run*.5,h+.9,z+d-.05],.025,walnut);
        break;
      }
      case 'shower': {      // душевая кабина: поддон, стеклянные стенки, стойка с лейкой
        const g=mat('#cfe0e4',.08,.1,{transparent:true,opacity:.35});
        box(x+w/2,.06,z+d/2,w,.12,d,white,.04);box(x+w/2,.125,z+d/2,w-.1,.01,d-.1,mat('#9db6ba',.2,.1),.03);
        box(x+w-.01,h/2+.12,z+d/2,.02,h-.1,d,g,.005);box(x+w/2,h/2+.12,z+d-.01,w,h-.1,.02,g,.005);
        box(x+w-.01,h/2+.12,z+d-.01,.03,h-.1,.03,steel,.005);
        pipeBetween([x+.08,.9,z+.08],[x+.08,h,z+.08],.014,steel);pipeBetween([x+.08,h,z+.08],[x+.3,h,z+.3],.012,steel);
        cylinder(x+.3,h-.03,z+.3,.09,.07,.03,steel);break;
      }
      case 'toilet': {
        if(it.hung){       // подвесной: инсталляция в стене, клавиша, чаша над полом
          box(x+.06,.6,z+d/2,.12,1.2,d+.3,matte,.02);box(x+.125,1.0,z+d/2,.012,.15,.24,steel,.01);
          sphere(x+.36,.38,z+d/2,.27,.14,.19,white);box(x+.2,.38,z+d/2,.16,.2,d*.85,white,.05);
          const ring=mesh(new T.TorusGeometry(.13,.03,12,40),white,x+.37,.48,z+d/2);ring.rotation.x=Math.PI/2;ring.scale.set(1.3,1,1);break;
        }
        box(x+.11,.48,z+d/2,.22,.66,d,white,.06);
        sphere(x+.38,.31,z+d/2,.27,.17,.20,white);
        cylinder(x+.38,.15,z+d/2,.10,.13,.30,white);
        const ring=mesh(new T.TorusGeometry(.14,.035,12,40),white,x+.38,.44,z+d/2);ring.rotation.x=Math.PI/2;ring.scale.set(1.25,1,1);
        break;
      }
      case 'washer': {      // face 'y' — у левой стены, дверцей вправо (модель строится лицом вперёд и поворачивается)
        const first=meshes.length,side=it.face==='y',W=side?d:w,D=side?w:d,x0=x+w/2-W/2,z0=z+d/2-D/2;
        box(x0+W/2,h/2,z0+D/2,W,h,D,white,.035);
        frontDisc(x0+W/2,h*.43,z0+D+.02,.22,steel);frontDisc(x0+W/2,h*.43,z0+D+.045,.165,glass);
        frontDisc(x0+W-.11,h-.10,z0+D+.035,.038,dark);box(x0+.14,h-.1,z0+D+.015,.20,.08,.025,white);
        if(side)for(const n of meshes.slice(first)){const dx=n.position.x-(x+w/2),dz=n.position.z-(z+d/2);n.position.x=x+w/2+dz;n.position.z=z+d/2-dx;n.rotation.y+=Math.PI/2;}
        break;
      }
      case 'mirror':if(it.round&&it.wall==='x'){const rr=Math.min(w,h)/2;frontDisc(X(it.x+w/2),it.z+h/2,-r.d/2+.02,rr+.02,brass,.02);frontDisc(X(it.x+w/2),it.z+h/2,-r.d/2+.035,rr,mat('#adc2c7',.09,.8),.02);break;}
        wallBox(it,A(it),it.z,w,h,.025,steel);wallBox(it,A(it)+.02,it.z+.02,w-.04,h-.04,.035,mat('#adc2c7',.09,.8));break;
      case 'towel':wallBox(it,A(it),it.z,w,h,.06,fabric);break;
      case 'window': {
        const a=it.x??it.y;wallBox(it,a-.04,it.z-.04,w+.08,h+.08,.035,wood);
        wallBox(it,a,it.z,w,h,.05,mat('#b8d2db',.25,.1,{emissive:'#acc4ce',emissiveIntensity:.18},{window:true}));
        wallBox(it,a+w/2-.018,it.z,.036,h,.075,white);wallBox(it,a-.06,it.z-.055,w+.12,.045,.20,white);break;
      }
      case 'door': {        // наличник, полотно (входная — тёмная, в гараж — стальная), филёнки, ручка
        const a=A(it),slab=it.m==='steel'?mat('#7d868a',.45,.45):it.m==='ext'?mat('#4b3a2e',.55):wood;
        wallBox(it,a-.07,0,w+.14,h+.07,.03,white);
        if(it.m==='glass'){wallBox(it,a,0,w,h,.04,graphite);wallBox(it,a+.06,.08,w-.12,h-.16,.05,mat('#b8d2db',.2,.1,{emissive:'#acc4ce',emissiveIntensity:.2},{window:true}));
          wallBox(it,a+w-.14,.98,.1,.03,.09,steel);break;}
        wallBox(it,a,0,w,h,.05,slab);
        if(it.m!=='steel')for(const y of [.22,1.1])wallBox(it,a+.11,y,w-.22,.75,.062,slab);
        else wallBox(it,a+.08,1.55,w-.16,.04,.062,dark);
        wallBox(it,a+w-.17,.98,.13,.03,.1,it.m==='ext'?brass:steel);wallBox(it,a+w-.13,.9,.04,.05,.07,dark);break;
      }
      // ---------- прихожая, коридор, переход ----------
      case 'coatrack': {    // планка с крючками, полка для шапок, одежда на крючках
        const a=A(it),cols=it.work?['#55604c','#3e4a53','#c49a35']:['#7a5646','#4d6375','#b8ae9c','#8a8f6a'];
        wallBox(it,a,it.z+h-.1,w,.1,.04,walnut);wallBox(it,a,it.z+h+.14,w,.03,.27,walnut);
        const n=Math.max(2,Math.round(w/.3));
        for(let i=0;i<n;i++){
          const c=a+w*(i+.5)/n;wallBox(it,c-.015,it.z+h-.13,.03,.06,.09,steel);
          if(i%3!==2)wallBox(it,c-.12,it.z+h-.98+(i%2)*.12,.24,.85-(i%2)*.12,.13,mat(cols[i%cols.length],.95));
        }
        wallBox(it,a+w*.3,it.z+h+.17,.26,.1,.2,mat(cols[1],.9));break;
      }
      case 'bench': {       // банкетка: сиденье с подушкой, боковины, полка с обувью
        for(const ax of [.03,w-.03])box(x+ax,h/2,z+d/2,.04,h,d,walnut,.008);
        box(x+w/2,h-.03,z+d/2,w,.05,d,wood,.012);box(x+w/2,h+.03,z+d/2,w-.08,.07,d-.05,fabric,.03);
        box(x+w/2,.11,z+d/2,w-.06,.022,d-.02,walnut,.004);
        const shoes=[mat('#3b2f28',.6),mat('#d9d4ca',.7),mat('#6b4a36',.6)];
        for(let i=0;i<Math.floor((w-.1)/.3);i++)for(const o of [-.055,.055])box(x+.2+i*.3+o,.165,z+d/2,.09,.08,.25,shoes[i%3],.03);
        break;
      }
      case 'boots': {       // пара обуви у порога (work — резиновые сапоги)
        const c=it.work?mat('#3f4c3b',.75):mat('#5a4233',.6);
        for(const o of [0,.14]){box(x+o+.05,.05,z+.13,.1,.1,.26,c,.035);box(x+o+.05,it.work?.22:.12,z+.07,.1,it.work?.32:.14,.12,c,.035);}
        break;
      }
      case 'umbrella': {    // подставка с зонтами
        cylinder(x+.12,.24,z+.12,.11,.09,.48,ceramics);
        for(const [dx,dz,c] of [[-.04,-.02,'#2f4c63'],[.04,.03,'#8c3b35'],[0,-.05,'#262b2e']]){
          pipeBetween([x+.12+dx*.5,.3,z+.12+dz*.5],[x+.12+dx*2,.92,z+.12+dz*2],.032,mat(c,.7));
          sphere(x+.12+dx*2,.95,z+.12+dz*2,.025,.025,.025,dark);
        }break;
      }
      case 'picture': {     // картина: рама, паспарту, цветовые плоскости
        const a=A(it),cs={a:['#c98f6b','#6f8f86'],b:['#7b93a8','#d7c39a'],c:['#9aa77e','#c46d55']}[it.m||'a'];
        wallBox(it,a,it.z,w,h,.035,walnut);wallBox(it,a+.04,it.z+.04,w-.08,h-.08,.042,mat('#ece6d8',.9));
        wallBox(it,a+.08,it.z+.08,(w-.16)*.58,h-.16,.048,mat(cs[0],.9));
        wallBox(it,a+.08+(w-.16)*.58,it.z+.08+(h-.16)*.35,(w-.16)*.42,(h-.16)*.65,.048,mat(cs[1],.9));break;
      }
      case 'sconce': {      // бра: светится вместе со светом комнаты
        const a=A(it),m=mat('#efe4cf',.6,0,{emissive:'#ffd29a',emissiveIntensity:0});lampMaterials.push(m);
        wallBox(it,a+w/2-.04,it.z-.04,.08,.12,.03,brass);
        const n=wallBox(it,a,it.z,w,h,.11,m);n.userData.action='ambient';picks.push(n);
        const light=new T.PointLight('#ffcf99',0,3.5,2);
        if(it.wall==='y')light.position.set(-r.w/2+.3,it.z+.1,Z(a+w/2));else light.position.set(X(a+w/2),it.z+.1,-r.d/2+.3);
        scene.add(light);lights.push(light);break;
      }
      case 'console': {     // консоль: тонкие ножки, столешница, ваза с ветками, чаша для ключей
        for(const ax of [.04,w-.04])for(const az of [.04,d-.04])box(x+ax,h/2,z+az,.03,h,.03,dark,.006);
        box(x+w/2,h,z+d/2,w,.04,d,walnut,.01);box(x+w/2,.16,z+d/2,w-.06,.02,d-.04,walnut,.005);
        box(x+w*.62,.22,z+d/2,.32,.1,d*.7,mat('#b9ad93',.9),.01);
        cylinder(x+.17,h+.12,z+d/2,.045,.065,.22,ceramics);
        for(let i=0;i<4;i++)pipeBetween([x+.17,h+.2,z+d/2],[x+.17+Math.cos(i*1.7)*.12,h+.55+i%2*.08,z+d/2+Math.sin(i*1.7)*.06],.007,walnut);
        cylinder(x+w-.2,h+.035,z+d/2,.09,.05,.035,brass);break;
      }
      case 'plant':plant(x,0,z,it.s||1);break;
      // ---------- квартира ----------
      case 'island': {      // остров: графитовый корпус, кварцевая столешница со свесом для стульев
        box(x+w/2,(h-.05)/2,z+d/2-.06,w-.04,h-.05,d-.12,graphite,.02);
        box(x+w/2,h-.02,z+d/2+.06,w+.06,.05,d+.12,quartz,.015);
        for(let i=0;i<Math.round(w/.5);i++)box(x+.25+i*.5,(h-.05)/2,z-.005,.012,h-.2,.012,dark,.002);break;
      }
      case 'stool': {       // барный стул: стальная опора, кольцо для ног, мягкое сиденье
        const cx=x+.2,cz=z+.2;cylinder(cx,.015,cz,.17,.17,.03,dark);cylinder(cx,.33,cz,.022,.022,.62,steel);
        const ring=mesh(new T.TorusGeometry(.13,.01,8,24),steel,cx,.3,cz);ring.rotation.x=Math.PI/2;
        cylinder(cx,.66,cz,.18,.16,.07,mat('#9a7a5c',.8));box(cx,.8,cz+.15,.3,.22,.04,mat('#9a7a5c',.8),.02);break;
      }
      case 'pendant': {     // подвесной светильник: шнур от потолка, купол; светится в ночном режиме
        if(k.overview)break;
        const top=Math.min(r.h,2.6),cy=top-.85;pipeBetween([X(it.x),top,Z(it.y)],[X(it.x),cy+.15,Z(it.y)],.005,dark);
        const m=mat('#2f3336',.5,.2,{side:T.DoubleSide});mesh(new T.ConeGeometry(.17,.2,28,1,true),m,X(it.x),cy+.08,Z(it.y));
        const bulb=mat('#efe4cf',.6,0,{emissive:'#ffd29a',emissiveIntensity:0});lampMaterials.push(bulb);
        const b=sphere(X(it.x),cy-.01,Z(it.y),.06,.06,.06,bulb);if(it.toy){b.userData.action='ambient';picks.push(b);}
        const light=new T.PointLight('#ffcf99',0,3,2);light.position.set(X(it.x),cy-.1,Z(it.y));scene.add(light);lights.push(light);break;
      }
      case 'desk': {        // стол: тонкие стальные ножки, дубовая столешница, кресло лицом к столу; монитор или лампа
        for(const ax of [.04,w-.04])box(x+ax,h/2,z+d/2,.03,h,d-.06,dark,.006);
        box(x+w/2,h,z+d/2,w,.035,d,oak,.01);box(x+w*.75,h-.12,z+d*.4,w*.4,.18,d*.75,oak,.01);
        if(it.monitor){box(x+w*.4,h+.03,z+.18,.2,.02,.14,dark,.01);box(x+w*.4,h+.16,z+.18,.03,.24,.03,dark);box(x+w*.4,h+.32,z+.2,.62,.36,.025,dark,.01);
          box(x+w*.4,h+.32,z+.215,.58,.32,.01,mat('#2e4d57',.2,.1,{emissive:'#3f6a73',emissiveIntensity:.25}));box(x+w*.4,h+.025,z+.42,.42,.015,.13,mat('#d9d9d2',.6),.004);}
        if(it.lamp){cylinder(x+.18,h+.02,z+.18,.06,.07,.03,dark);pipeBetween([x+.18,h+.03,z+.18],[x+.28,h+.4,z+.22],.008,dark);
          const sh=mesh(new T.ConeGeometry(.07,.11,18,1,true),mat('#c49a35',.5,.2,{side:T.DoubleSide}),x+.33,h+.36,z+.24);sh.rotation.z=.6;
          for(let i=0;i<3;i++)box(x+w-.25,h+.03+i*.035,z+.2,.22,.03,.28,mat(['#5b7a8c','#b8774e','#7d9468'][i],.8),.005);}
        const cx=x+w*.4,cz=z+d+.3;cylinder(cx,.03,cz,.26,.26,.03,dark);cylinder(cx,.25,cz,.025,.025,.42,steel);
        box(cx,.48,cz,.46,.07,.44,fabric,.04);box(cx,.8,cz+.21,.44,.55,.06,fabric,.05);break;
      }
      case 'bookcase': {    // стеллаж: каркас, полки, книги; open — перегородка без задней стенки; shoes — обувные полки
        const along=d>w,L=along?d:w,D=along?w:d,n=Math.max(2,Math.round(h/.38)),wood2=it.open?oak:walnut;
        const B=(a,y,b,la,hh,lb,m)=>along?box(x+b,y,z+a,lb,hh,la,m,.006):box(x+a,y,z+b,la,hh,lb,m,.006);
        for(const a of [.015,L-.015])B(a,h/2,D/2,.03,h,D,wood2);
        if(!it.open)B(L/2,h/2,.01,L,h,.02,wood2);
        const cols=['#5b7a8c','#b8774e','#7d9468','#c9b48a','#8a5a5a','#d8d2c4'];
        for(let i=0;i<=n;i++){const y=.02+i*(h-.04)/n;B(L/2,y,D/2,L,.025,D,wood2);
          if(i<n)for(let j=0,a=.07;a<L-.12;j++){const bw=it.shoes?.24:.03+((i*7+j*3)%4)*.012,bh=it.shoes?.1:(h-.04)/n*(.55+((i+j)%3)*.12);
            if(it.open&&(i+j)%4===1){B(a+.08,y+.12,D/2,.16,.22,.16,ceramics);a+=.32;continue;}
            B(a+bw/2,y+.013+bh/2,D/2,bw,bh,D*.75,mat(cols[(i*5+j)%cols.length],.85));a+=bw+(it.shoes?.06:.005);if(!it.shoes&&j%9===8)a+=.18;}}
        break;
      }
      case 'armchair': {    // кресло на тонких ножках; pouf — пуф-мешок
        if(it.pouf){sphere(x+w/2,.25,z+d/2,w/2,.28,d/2,mat('#c98f6b',.95));break;}
        for(const ax of [.1,w-.1])for(const az of [.1,d-.1])cylinder(x+ax,.09,z+az,.018,.012,.18,walnut);
        const f=mat('#a99a7e',.95);box(x+w/2,.3,z+d/2,w,.2,d,f,.07);box(x+w/2,.62,z+d-.1,w,.55,.18,f,.08);
        for(const ax of [.07,w-.07])box(x+ax,.48,z+d/2,.13,.3,d,f,.06);box(x+w/2,.43,z+d*.45,w-.26,.1,d*.7,cushion,.05);break;
      }
      case 'vanity': {      // подвесная тумба с накладной раковиной и смесителем из стены
        const t=it.small?.32:.38;
        box(x+w/2,.35+(h-.4)/2,z+d/2,w,h-.4,d,oak,.015);box(x+w/2,h-.03,z+d/2,w+.02,.04,d+.02,quartz,.01);
        cylinder(x+w/2,h+.06,z+d*.55,t/2,t/2-.04,.12,white);cylinder(x+w/2,h+.115,z+d*.55,t/2-.03,t/2-.05,.012,mat('#9db6ba',.2,.1));
        pipeBetween([x+w/2,h+.32,z+.02],[x+w/2,h+.32,z+d*.4],.012,brass);break;
      }
      case 'walkin': {      // душ walk-in: плитка-поддон в уровень пола, трап, стеклянная стенка с профилем, тропическая лейка
        if(k.overview){box(x+w/2,.012,z+d/2,w,.01,d,mat('#9fa8a6',.6),.004);box(x+w-.01,.5,z+d/2,.012,1,d,mat('#cfe0e4',.08,.1,{transparent:true,opacity:.32}),.003);break;}
        const g=mat('#cfe0e4',.08,.1,{transparent:true,opacity:.32});
        box(x+w/2,.012,z+d/2,w,.01,d,mat('#9fa8a6',.6),.004);box(x+w/2,.02,z+d-.12,w-.2,.006,.04,steel,.002);
        box(x+w-.01,h/2+.02,z+d/2,.012,h,d,g,.003);box(x+w-.01,h+.02,z+d/2,.03,.02,d,dark,.003);box(x+w-.01,h/2+.02,z+d-.01,.03,h,.03,dark,.003);
        pipeBetween([x+.06,.9,z+.06],[x+.06,h+.1,z+.06],.012,dark);pipeBetween([x+.06,h+.1,z+.06],[x+.3,h+.1,z+.3],.01,dark);
        cylinder(x+.3,h+.08,z+.3,.13,.13,.015,dark);box(x+.06,1.05,z+.15,.04,.12,.08,dark,.01);break;
      }
      // ---------- склад ----------
      case 'rack': {        // ряд паллетных стеллажей (двойной или single — у стены): стойки, балки, часть мест с грузом; на плане дома — нижний ярус
        const {post,beam,pal,loads}=wh(),H=k.overview?Math.min(h,1.7):h,n=Math.max(1,Math.round(w/2.7)),bay=w/n,lv=Math.min(4,Math.max(2,Math.floor(h/1.8)));
        const step=H/lv,sides=it.single?[[z,1.1]]:[[z,1.1],[z+d-1.1,1.1]];
        for(const [z0,dd] of sides){
          for(let i=0;i<=n;i++){                                                                   // рама: две стойки и распорки
            for(const zz of [z0+.05,z0+dd-.05])flatBox(x+i*bay,H/2,zz,.09,H,.09,post);
            for(let yy=.4;yy<H-.2;yy+=1.6)flatBox(x+i*bay,yy,z0+dd/2,.05,.05,dd-.1,post);
          }
          for(let l=1;l<=lv;l++)if(l<lv||!k.overview)flatBox(x+w/2,l*step-.06,z0+dd/2,w,.1,dd-.1,beam);
          for(let l=0;l<lv;l++)for(let i=0;i<n;i++){
            if((i*5+l*3+Math.round(z0))%3===1)continue;                                        // треть мест пустые
            const y=l*step,lh=Math.min(1.0,step-.35),cx=x+(i+.5)*bay;
            flatBox(cx,y+.07,z0+dd/2,bay-.3,.12,dd-.12,pal);flatBox(cx,y+.13+lh/2,z0+dd/2,bay-.4,lh,dd-.2,loads[(i+l)%3]);
          }
        }
        break;
      }
      case 'pallets': {     // паллеты с грузом в зоне приёмки
        const {pal,loads}=wh();
        for(let i=0;i<(it.n||2);i++){const cx=x+.6+i*1.35;flatBox(cx,.07,z+d/2,1.2,.14,d,pal);flatBox(cx,.14+.55,z+d/2,1.1,1.1,d-.1,loads[i%3]);}
        break;
      }
      case 'forklift': {    // погрузчик: корпус, противовес, защитная крыша, мачта и вилы к воротам
        const y0=mat('#e0b234',.45,.15),cx=x+w/2;
        box(cx,.55,z+1.45,w,.7,1.7,y0,.06);box(cx,.62,z+2.25,w*.95,.8,.32,dark,.05);box(cx,1.05,z+1.7,.5,.12,.5,dark,.04);box(cx,1.3,z+1.95,.5,.5,.1,dark,.04);
        for(const ax of [.05,w-.05])for(const az of [.75,2.15])box(x+ax,1.5,z+az,.06,1.1,.06,dark,.01);
        box(cx,2.07,z+1.45,w,.06,1.5,dark,.01);
        for(const ax of [.25,w-.25])box(x+ax,(h+.1)/2,z+.5,.1,h,.12,dark,.01);
        box(cx,.45,z+.4,w*.8,.5,.06,steel,.01);
        for(const ax of [.32,w-.32])box(x+ax,.06,z-.1,.12,.05,1.1,steel,.005);
        for(const [ax,az,rr] of [[0,.8,.3],[w,.8,.3],[0,2.1,.25],[w,2.1,.25]]){const wh=cylinder(x+ax,rr,z+az,rr,rr,.22,dark);wh.rotation.z=Math.PI/2;}
        break;
      }
      case 'duct': {        // приточный воздуховод под потолком: оцинковка, фланцы, решётки-диффузоры снизу
        const g=mat('#b7bdbf',.35,.6),a=A(it);
        wallBox(it,a,it.z,w,h,.55,g);
        for(let t=0;t<=w;t+=1.5)wallBox(it,a+t-.025,it.z-.03,.05,h+.06,.6,steel);
        for(let t=1.2;t<w-.5;t+=3)wallBox(it,a+t,it.z-.05,.45,.05,.5,dark);
        break;
      }
      case 'fan': {         // вытяжной вентилятор в стене: рама, решётка, лопасти
        const a=A(it),cx=X(a+w/2),cy=it.z+h/2,cz=-r.d/2+.08;
        wallBox(it,a,it.z,w,h,.06,steel);frontDisc(cx,cy,cz+.02,w*.42,dark,.05);
        for(let i=0;i<4;i++){const b=box(cx,cy,cz+.07,w*.7,.1,.015,steel,.005);b.rotation.z=i*Math.PI/4+.3;}
        frontDisc(cx,cy,cz+.09,.07,steel,.03);break;
      }
      case 'airheater': {   // воздушно-тепловой агрегат: корпус, жалюзи, трубы теплоносителя от котельной
        const a=A(it);wallBox(it,a,it.z,w,h,.45,mat('#c7c9c4',.5,.2));
        for(let i=1;i<6;i++)wallBox(it,a+.06,it.z+i*h/6,w-.12,.025,.48,dark);
        pipeBetween([-r.w/2+.08,it.z,Z(a+.15)],[-r.w/2+.08,.2,Z(a+.15)],.02,red);pipeBetween([-r.w/2+.08,it.z,Z(a+w-.15)],[-r.w/2+.08,.2,Z(a+w-.15)],.02,blue);
        break;
      }
      case 'firebox': {     // пожарный шкаф: красный корпус, окно, рукав
        const a=A(it);wallBox(it,a,it.z,w,h,.22,red);wallBox(it,a+.08,it.z+.25,w-.16,h-.33,.235,glass);
        wallBox(it,a+.1,it.z+.07,w-.2,.1,.235,white);break;
      }
      case 'highbay': {     // подвесной светильник склада; светится в ночном режиме
        if(k.overview)break;
        const top=r.h,cy=top-1.3,cx=X(it.x),cz=Z(it.y);pipeBetween([cx,top,cz],[cx,cy+.2,cz],.008,dark);
        mesh(new T.ConeGeometry(.38,.28,28,1,true),mat('#5d6366',.5,.4,{side:T.DoubleSide}),cx,cy+.1,cz);
        const bulb=mat('#efe4cf',.6,0,{emissive:'#ffe2b8',emissiveIntensity:0});lampMaterials.push(bulb);
        const b=box(cx,cy-.03,cz,.5,.04,.5,bulb,.02);if(it.toy){b.userData.action='ambient';picks.push(b);}
        if(it.lit){const light=new T.PointLight('#ffe2b8',0,14,1.6);light.position.set(cx,cy-.2,cz);scene.add(light);lights.push(light);}
        break;
      }
      // ---------- административное здание ----------
      case 'serverrack': {  // серверные стойки: графитовый корпус, серверы с индикаторами, ручка двери; стоек — по ширине (0,6 м)
        const n=Math.max(1,Math.round(w/.6)),u=w/n;
        const led=mat('#3cc99c',.4,0,{emissive:'#3cc99c',emissiveIntensity:.9}),amber=mat('#e7a54d',.4,0,{emissive:'#e7a54d',emissiveIntensity:.8});
        for(let i=0;i<n;i++){
          const cx=x+u*(i+.5);
          box(cx,h/2,z+d/2,u-.02,h,d,graphite,.012);
          box(cx,h/2,z+d+.006,u-.06,h-.08,.012,dark,.004);
          for(let j=0;j<9;j++){
            const y=.22+j*(h-.4)/9;
            box(cx,y,z+d+.016,u-.14,.12,.012,mat('#2a3135',.5,.2),.004);
            box(cx-u*.3,y,z+d+.024,.03,.02,.008,(i*3+j)%7===4?amber:led);box(cx-u*.22,y,z+d+.024,.03,.02,.008,led);
          }
          box(cx+u*.4,h*.52,z+d+.035,.02,.24,.025,steel,.006);
        }
        break;
      }
      case 'switchboard': { // электрощиты: светло-серые шкафы на цоколе, двери с замками, окно приборов учёта, знак «высокое напряжение»
        const n=Math.max(1,Math.round(w/.8)),u=w/n,grey=mat('#c9ccc8',.55,.15),warn=mat('#e2b13c',.5);
        for(let i=0;i<n;i++){
          const cx=x+u*(i+.5);
          box(cx,.05,z+d/2,u-.02,.1,d-.04,dark);
          box(cx,h/2+.05,z+d/2,u-.02,h-.1,d,grey,.012);
          box(cx,h/2+.05,z+d+.008,u-.08,h-.22,.016,grey,.006);
          box(cx,h*.74,z+d+.02,u*.5,.2,.01,mat('#2e3a3f',.2,.1),.004);
          box(cx,h*.56,z+d+.02,.13,.11,.008,warn,.002);
          box(cx+u*.36,h*.5,z+d+.03,.02,.14,.025,dark,.004);
        }
        break;
      }
      case 'heatunit': {    // тепловой пункт: рама, пластинчатый теплообменник, насосы, подача и обратка с задвижками и манометрами
        const fr=mat('#3d4246',.5,.3),pump=mat('#2f6f9a',.45,.2),back=z+.16;
        box(x+w/2,.06,z+d/2,w,.08,d,fr,.01);
        const hx=x+.55,hz=z+d*.58;
        box(hx-.3,.8,hz,.07,1.15,.5,blue,.01);box(hx+.3,.8,hz,.07,1.15,.5,blue,.01);
        for(let i=0;i<13;i++)box(hx-.24+i*.04,.8,hz,.03,1.02,.46,steel,.004);
        for(const yy of [.32,1.28])for(const dz of [-.2,.2])pipeBetween([hx-.36,yy,hz+dz],[hx+.36,yy,hz+dz],.012,steel);
        pipeBetween([x,1.4,back],[x+w,1.4,back],.055,red);pipeBetween([x,.98,back],[x+w,.98,back],.055,blue);
        pipeBetween([hx-.15,1.4,back],[hx-.15,1.4,hz-.25],.04,red);pipeBetween([hx+.15,.98,back],[hx+.15,.98,hz-.25],.04,blue);
        for(const px of [x+w*.64,x+w*.86]){
          cylinder(px,.32,hz,.12,.12,.2,pump);cylinder(px,.56,hz,.085,.085,.28,dark);
          pipeBetween([px,.98,back],[px,.98,hz],.035,blue);pipeBetween([px,.98,hz],[px,.7,hz],.035,blue);
        }
        for(const vx of [x+w*.34,x+w*.52])for(const yy of [1.4,.98]){
          box(vx,yy,back,.08,.18,.17,dark,.01);cylinder(vx,yy+.17,back,.012,.012,.14,steel);cylinder(vx,yy+.25,back,.06,.06,.016,red);
        }
        for(const mx of [x+w*.25,x+w*.96]){cylinder(mx,1.53,back,.01,.01,.12,steel);frontDisc(mx,1.64,back+.02,.055,white,.025);}
        break;
      }
      case 'ac': {          // настенный кондиционер: корпус, жалюзи, индикатор
        const a=A(it);wallBox(it,a,it.z,w,h,.22,white);wallBox(it,a+.04,it.z+.03,w-.08,.035,.235,mat('#b9bebc',.5));
        wallBox(it,a+w-.14,it.z+h-.09,.04,.02,.228,mat('#3cc99c',.4,0,{emissive:'#3cc99c',emissiveIntensity:.8}));break;
      }
      case 'board': {       // маркерная доска в переговорной: рама, белое поле, полка для маркеров
        const a=A(it);wallBox(it,a-.02,it.z-.02,w+.04,h+.04,.025,steel);wallBox(it,a,it.z,w,h,.032,mat('#eef0ec',.3));
        wallBox(it,a+.1,it.z-.07,w*.4,.03,.08,steel);
        [['#3c7fb8',.2],['#c0473a',.28],['#2f9c74',.36]].forEach(([c,o])=>wallBox(it,a+o,it.z+h*.6,.5,.02,.034,mat(c,.6)));break;
      }
      // ---------- гараж ----------
      case 'gate': {        // секционные ворота на стене: рама, панели с канавками, ручка
        const a=A(it);wallBox(it,a-.08,0,w+.16,h+.08,.05,dark);
        const n=5;for(let i=0;i<n;i++)wallBox(it,a,.03+i*h/n,w,h/n-.025,.07,i%2?white:mat('#d2d6d8',.5,.2));
        wallBox(it,a+w/2-.15,.32,.30,.05,.10,steel);
        if(it.wall==='x')for(const o of [-.25,w+.05])wallBox(it,a+o,.2,.2,.35,.18,dark);   // отбойники у ворот склада
        break;
      }
      case 'toolboard': {   // перфопанель: ключи, молоток, отвёртки
        wallBox(it,it.x,it.z,w,h,.03,mat('#8b7f6c',.9));
        for(let i=0;i<6;i++)wallBox(it,it.x+.12+i*.11,it.z+.18,.025,.38+(i%3)*.08,.05,steel);
        wallBox(it,it.x+.88,it.z+.45,.36,.05,.06,walnut);wallBox(it,it.x+1.05,it.z+.38,.12,.2,.07,dark);
        for(let i=0;i<3;i++){wallBox(it,it.x+1.3+i*.08,it.z+.25,.03,.28,.05,i===1?red:blue);wallBox(it,it.x+1.305+i*.08,it.z+.12,.02,.13,.05,steel);}
        break;
      }
      case 'workbench': {   // верстак: столешница из бруса, стальные ножки и полка, тиски, ящик, лампа на кронштейне
        for(const ax of [.06,w-.06])for(const az of [.06,d-.06])box(x+ax,(h-.06)/2,z+az,.05,h-.06,.05,dark,.006);
        box(x+w/2,.18,z+d/2,w-.1,.03,d-.1,steel,.005);
        for(let i=0;i<6;i++)box(x+w*(i+.5)/6,h-.03,z+d/2,w/6-.008,.06,d,i%2?wood:walnut,.006);
        box(x+w-.32,h+.07,z+.25,.22,.1,.16,blue,.01);box(x+w-.32,h+.13,z+.25,.3,.04,.05,steel,.008);
        box(x+w-.32,h+.06,z+.42,.04,.04,.26,steel,.005);
        box(x+.5,h+.09,z+.22,.46,.18,.24,red,.02);box(x+.5,h+.2,z+.22,.3,.03,.03,dark,.01);
        box(x+1.15,h+.03,z+.45,.28,.03,.06,steel,.005);box(x+1.25,h+.03,z+.3,.22,.03,.05,walnut,.005);
        cylinder(x+.18,h+.03,z+.12,.07,.08,.04,dark);pipeBetween([x+.18,h+.05,z+.12],[x+.25,h+.45,z+.2],.012,steel);
        const lampShade=mesh(new T.ConeGeometry(.09,.13,20,1,true),mat('#d9a43a',.5,.2,{side:T.DoubleSide}),x+.3,h+.43,z+.24);lampShade.rotation.z=.5;
        break;
      }
      case 'tires': for(let i=0;i<(it.n||3);i++){
        const t=mesh(new T.TorusGeometry(.27,.11,12,28),dark,x,.11+i*.22,z);t.rotation.x=Math.PI/2;
        cylinder(x,.11+i*.22,z,.2,.2,.16,steel);
      }break;
      case 'shelf': {       // стеллаж: стойки, четыре полки, коробки
        for(const ax of [0,w])for(const az of [0,d])box(x+ax,h/2,z+az,.04,h,.04,dark,.005);
        for(let i=0;i<4;i++){const y=.12+i*(h-.2)/3;box(x+w/2,y,z+d/2,w,.03,d,steel,.005);
          if(i<3)for(let j=0;j<2;j++)box(x+.2+j*.48+i*.06,y+.13,z+d/2,.36,.22,d*.7,j?mat('#b08a5a'):mat('#9a7b52'),.01);}
        break;
      }
      case 'parking': for(const yy of it.ys)box(x+it.w/2,.02,Z(yy),it.w,.006,.06,mat('#d9b23c',.6),.002);break;
      case 'car': {
        const m=IGIH.toys.car();if(!m)break;
        car=(m.id==='merc'?IGIH.car3dGclass:IGIH.car3d)(T,{mat,box,cylinder},m);   // G-класс — подробная модель
        car.group.position.set(x+(w-m.L)/2,0,z+d/2);scene.add(car.group);
        for(const n of car.meshes)meshes.push(n);
        break;
      }
    }
  }
  const th=k.theme,badgeSize=k.badgeSize||.24;
  // общий свет комнаты для ночного режима: точечный свет под потолком; в комнате (не на плане дома) — бра на задней стене
  let roomLevel='none',sconce=null;
  const ALARM=k.theme.ALARM;   // цвет тревоги: насыщенный оранжевый и красный (ui/room3d-theme.js)
  const alarm=new T.PointLight(k.theme.ALARM.warn,0,Math.max(r.w,r.d)*(k.overview?1.1:1.8),1.3);
  {
    const top=Math.min(r.h,2.6),light=new T.PointLight('#ffdcae',0,Math.max(r.w,r.d)*1.7,1.6);
    light.position.set(0,top-.35,0);light.userData.room=true;scene.add(light);lights.push(light);
    alarm.position.set(0,top-.5,0);scene.add(alarm);
    if(!k.overview){
      const bx=r.w*.18;box(bx,top-.42,-r.d/2+.03,.16,.06,.06,dark,.02);
      const m=sconce=mat('#efe4cf',.6,0,{emissive:'#ffd29a',emissiveIntensity:0});lampMaterials.push(m);
      const shade=sphere(bx,top-.42,-r.d/2+.09,.17,.09,.08,m);shade.userData.action='ambient';picks.push(shade);
    }
  }
  for(const it of [...r.items].sort((a,b)=>(a.draw==='rug'?-1:0)-(b.draw==='rug'?-1:0))){
    const first=meshes.length;model(it);
    if(it.kind){
      const [x,z]=at(it),w=it.w||.2,d=it.d||.2,h=it.h||.4;
      // круг на полу: у настенного прибора — перед стеной, у напольного — вокруг; значок — над прибором
      const [cx,cz]=it.wall==='x'?[X(it.x+w/2),-r.d/2+.3]:it.wall==='y'?[-r.w/2+.3,Z(it.y+w/2)]:it.draw==='pipe'?[x,z]:[x+w/2,z+d/2];
      const [bx,bz]=it.wall==='x'?[cx,-r.d/2+.16]:it.wall==='y'?[-r.w/2+.16,cz]:[cx,cz];
      const top=Math.min(r.h+.08,(it.z||0)+h)+.18;
      const radius=it.draw==='pipe'?(it.r||.1)+.22:Math.max(.35,Math.min(Math.max(w,d)/2+.18,1));
      // свой материал у каждой детали прибора — чтобы подсвечивать корпус, не трогая соседнюю мебель
      const glowMats=meshes.slice(first).map(n=>{n.material=th.track(n.material.clone(),n.material.userData.jitter||0);n.material.emissive.set('#000000');return n.material;});
      // контур по силуэту прибора: та же форма чуть крупнее, видна только «изнанка» — тонкая цветная кайма
      const outline=th.own(new T.MeshBasicMaterial({side:T.BackSide,transparent:true,opacity:0,depthWrite:false}));
      for(const n of meshes.slice(first)){
        const hull=new T.Mesh(n.geometry,outline);hull.position.copy(n.position);hull.quaternion.copy(n.quaternion);
        hull.scale.copy(n.scale).multiplyScalar(k.overview?1.09:1.06);hull.renderOrder=3;n.parent.add(hull);
      }
      monitors.push({id:it.id,level:'none',badge:th.badge(scene,bx,top,bz,badgeSize),halo:th.halo(scene,cx,cz,radius),glowMats,outline});
    }
    if(it.kind||it.toy)for(const n of meshes.slice(first)){n.userData.action=it.id||it.toy;picks.push(n);}
  }
  flushBatch();
  /** Свет тревоги в комнате: сила по уровню, днём ярче (иначе не видно); wave 0…1 — «дыхание». */
  function alarmLight(now){
    const on=roomLevel==='warn'||roomLevel==='crit',night=!!IGIH.toys.state.ambient;
    const wave=th.reduce.matches?1:.55+.45*Math.sin(now/(roomLevel==='crit'?170:480));
    alarm.intensity=on?(roomLevel==='crit'?1.6:1)*(night?16:45)*(k.overview?.9:1)*wave:0;
    if(sconce&&on){sconce.emissive.set(ALARM[roomLevel]);sconce.emissiveIntensity=.5+.6*wave;}
    // стены комнаты светятся цветом тревоги
    if(k.wallMat){k.wallMat.emissive.set(on?ALARM[roomLevel]:'#000000');k.wallMat.emissiveIntensity=on?(roomLevel==='crit'?.22+.38*wave:.14+.26*wave):0;}
    return on&&!th.reduce.matches;
  }
  /** Пульс тревог; true — нужны ещё кадры. */
  /** Кадр экрана: первые 2,8 с — заставка с логотипом, дальше слайды. */
  function tvFrame(now){
    const c=tv.ctx,t=now-tv.t0;
    if(t<2800){
      c.fillStyle='#e9eee6';c.fillRect(0,0,512,288);
      if(tv.logo.complete&&tv.logo.naturalWidth){const k=tv.logo.naturalWidth/tv.logo.naturalHeight;c.drawImage(tv.logo,(512-132*k)/2,44,132*k,132);}
      c.fillStyle='#165e49';c.textAlign='center';c.font='600 36px Segoe UI';c.fillText('IGIH',256,218);
      c.font='15px Segoe UI';c.fillText('Дом под присмотром',256,250);
    }else IGIH.tvSlides.draw(c,t-2800);
    tv.map.needsUpdate=true;
  }
  function pulse(now=performance.now()){
    let alive=alarmLight(now);
    if(tv?.on){if(now-tv.last>80){tv.last=now;tvFrame(now);}alive=true;}
    if(car?.pulse(now))alive=true;
    for(const p of monitors){
      const g=th.glow(p.level,now);for(const m of p.glowMats)m.emissiveIntensity=g;
      p.halo.material.opacity={crit:.35+g,warn:.55,info:.35,ok:.18}[p.level]||0;
      p.outline.opacity=p.level==='crit'?.45+g:p.level==='warn'?.75:0;
      if(p.level==='crit'&&!th.reduce.matches)alive=true;
    }
    return alive;
  }
  return {pulse,select(id){for(const p of monitors)p.badge.scale(p.id===id?1.4:1);},update(levels){
    for(const p of monitors){
      p.level=levels?.items?.[p.id]||'none';const c=th.status(p.level);
      const a=th.alarm(p.level);p.badge.set(c);p.halo.material.color.copy(a);p.outline.color.copy(a);for(const m of p.glowMats)m.emissive.copy(a);
    }
    roomLevel=levels?.rooms?.[r.id]||'none';
    car?.update();
    if(tv){
      const on=!!IGIH.toys.state.tv;
      if(on&&!tv.on){tv.t0=performance.now();tv.last=0;}
      tv.on=on;tv.screen.map=tv.screen.emissiveMap=on?tv.map:null;tv.screen.needsUpdate=true;
      tv.screen.color.set(on?'#ffffff':'#10191c');tv.screen.emissive.set(on?'#ffffff':'#7c9d9c');tv.screen.emissiveIntensity=on?.85:0;
    }
    const alarmOn=roomLevel==='warn'||roomLevel==='crit';
    alarm.color.set(ALARM[roomLevel]||ALARM.warn);
    if(sconce)sconce.emissive.set('#ffd29a');
    for(const m of lampMaterials)m.emissiveIntensity=IGIH.toys.state.ambient?.9:0;
    // при тревоге обычный свет комнаты приглушён — чтобы цвет тревоги читался
    for(const l of lights)l.intensity=IGIH.toys.state.ambient?(l.userData.room?(k.overview?5:9)*(alarmOn?.35:1):7):0;
    pulse();
  }};
};

/* ОБЪЁМНЫЕ ВИДЫ — общее для плана дома (house3d) и комнат (living3d, room3d-models):
   1) цвета из палитры: материалы создаются через theme.mat(), запоминают исходный цвет и роль,
      theme.apply() перекрашивает их при смене палитры. Роли:
        wall  — стены: --wall-a с оттенком комнаты (--c-room-<tint>) на долю --tint-k;
        edge  — цоколь: --wall-edge;
        floor — плитка и камень: --floor, смешанный с исходным цветом;
        без роли — предмет: исходный цвет, приглушённый к фону на (100% − --mat-k);
   2) свет: день (по умолчанию) и вечер — когда включён «Свет в сцене»: общий свет гаснет до сумерек,
      светят только лампы, поэтому их видно;
   3) статусы приборов: цвета --st-*, значок над прибором (виден сквозь мебель), круг на полу,
      подсветка корпуса; критичное пульсирует (кроме режима «меньше движения»). */
window.IGIH = window.IGIH || {};
IGIH.room3dTheme = (T) => {
  const tracked = [], owned = [];
  const root = document.documentElement;
  let vars = null;
  const css = (name) => { vars ||= getComputedStyle(root); return vars.getPropertyValue(name).trim(); };
  const col = (v) => { const c = new T.Color(); try { c.set(v || '#888888'); } catch { c.set('#888888'); } return c; };
  const pct = (name, dflt) => { const v = parseFloat(css(name)); return Number.isFinite(v) ? v / 100 : dflt; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /** Материал, который следует палитре. look = { role, tint } — см. шапку. */
  function mat(color, roughness = .8, metalness = 0, extra = {}, look = {}) {
    const m = new T.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    m.userData = { base: '#' + new T.Color(color).getHexString(), ...look };
    tracked.push(m);
    return m;
  }
  /** Копия материала (плитка пола) с небольшим сдвигом яркости jitter — тоже следует палитре. */
  function track(m, jitter = 0) { m.userData.jitter = jitter; tracked.push(m); return m; }
  /** Отдать на удаление вместе со сценой (геометрии, материалы, текстуры значков). */
  const own = (...list) => { owned.push(...list); return list[0]; };

  function apply() {
    vars = null;
    const bg = col(css('--bg')), k = pct('--mat-k', 1), tk = pct('--tint-k', .2);
    for (const m of tracked) {
      const u = m.userData;
      let c;
      if (u.role === 'wall') { c = col(css('--wall-a')); if (u.tint) c.lerp(col(css('--c-room-' + u.tint)), tk * .7); }
      else if (u.role === 'edge') c = col(css('--wall-edge'));
      else if (u.role === 'floor') c = col(css('--floor')).lerp(col(u.base), .5);
      else c = col(u.base).lerp(bg, 1 - k);
      if (u.jitter) c.offsetHSL(0, 0, u.jitter);
      m.color.copy(c);
    }
  }

  const status = (level) => col(css('--st-' + (level || 'none')) || css('--st-none'));
  /** Цвет тревоги в сцене (свет, пол, контур): насыщенный, не зависит от палитры — чтобы читался на любом фоне. */
  const ALARM = { warn: '#ff6a00', crit: '#ff0f0f' };
  const alarm = (level) => (ALARM[level] ? col(ALARM[level]) : status(level));
  const isDark = () => getComputedStyle(root).colorScheme === 'dark';

  /** Свет сцены: день или вечер (evening — включены лампы). */
  function mood({ hemi, sun, fill, renderer }, evening) {
    const dark = isDark();
    hemi.color.set(evening ? '#7486ad' : '#eef4ff');
    hemi.groundColor.set(evening ? '#4a4440' : '#9d927f');
    hemi.intensity = evening ? 1.05 : dark ? 2.0 : 2.2;
    sun.color.set(evening ? '#9db4dd' : '#fff2da');
    sun.intensity = evening ? .6 : dark ? 2.9 : 3.2;
    if (fill) fill.intensity = evening ? .1 : .75;
    renderer.toneMappingExposure = evening ? 1.45 : 1.15;
    // окна: днём светятся небом, вечером — тёмное стекло с синевой
    for (const m of tracked) if (m.userData.window) {
      m.userData.day ||= { emissive: '#' + m.emissive.getHexString(), k: m.emissiveIntensity };
      if (evening) { m.color.set('#1c2638'); m.emissive.set('#16233a'); m.emissiveIntensity = .5; }
      else { m.emissive.set(m.userData.day.emissive); m.emissiveIntensity = m.userData.day.k; }
    }
  }

  // мягкий круг для значков статуса (один на сцену)
  let discTex = null;
  function disc() {
    if (discTex) return discTex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 29, 0, Math.PI * 2); x.fill();
    discTex = own(new T.CanvasTexture(c)); discTex.colorSpace = T.SRGBColorSpace;
    return discTex;
  }
  /** Значок статуса: белая обводка + цветной круг, всегда к зрителю и поверх мебели. size — диаметр, м. */
  function badge(parent, x, y, z, size) {
    const make = (s, order) => {
      const m = own(new T.SpriteMaterial({ map: disc(), depthTest: false, depthWrite: false, transparent: true }));
      const n = new T.Sprite(m); n.position.set(x, y, z); n.scale.set(s, s, 1); n.renderOrder = order; parent.add(n); return n;
    };
    const ring = make(size, 20), dot = make(size * .7, 21);
    return { ring, dot, base: size, set(c) { dot.material.color.copy(c); }, scale(f) { ring.scale.setScalar(size * f); dot.scale.setScalar(size * .7 * f); } };
  }
  /** Круг на полу вокруг прибора. */
  function halo(parent, x, z, radius) {
    const m = own(new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }));
    const n = new T.Mesh(own(new T.RingGeometry(radius * .62, radius, 48)), m);
    n.rotation.x = -Math.PI / 2; n.position.set(x, .034, z); n.renderOrder = 5; parent.add(n);
    return n;
  }
  /** Сила подсветки по уровню; для «крит» — с пульсом по времени now (мс). */
  function glow(level, now) {
    if (level === 'crit') return reduce.matches ? .45 : .28 + .22 * (.5 + .5 * Math.sin(now / 260));
    return level === 'warn' ? .3 : 0;
  }

  function dispose() {
    for (const o of [...tracked, ...owned]) o.dispose?.();
    tracked.length = owned.length = 0;
  }

  return { mat, track, own, apply, status, alarm, ALARM, mood, badge, halo, glow, dispose, isDark, reduce };
};

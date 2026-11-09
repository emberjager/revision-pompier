/* ---------- Maths illimitées : exercices tirés au hasard, réponses calculées par le programme ----------
   Programme du concours (arrêté du 30 novembre 2020) : règle de trois, partages, surfaces et volumes, temps, conversions, vitesse, densité.
   Chaque générateur rend {q, a, w, e} : énoncé, bonne réponse, pièges (erreurs courantes), explication du calcul. */
(function(){
  const PI = 3.14;
  const r2 = x => Math.round(x * 100) / 100;
  // Nombre à la française : 1 200 · 2,5 · 0,25
  const nb = (x, d = 2) => {
    const v = Math.round(x * 10 ** d) / 10 ** d, neg = v < 0, a = Math.abs(v);
    let [i, f] = String(a).split(".");
    i = i.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (neg ? "−" : "") + i + (f ? "," + f : "");
  };
  const hm = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? " " + String(r).padStart(2, "0") : ""}` : `${r} min`; };
  const clock = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`; };
  const P = (rnd, a) => a[Math.floor(rnd() * a.length)];
  const I = (rnd, lo, hi, step = 1) => lo + step * Math.floor(rnd() * (Math.floor((hi - lo) / step) + 1));

  const GEN = {
    debit: {n: "Débits et autonomie", g: [
      rnd => { const D = P(rnd, [125, 150, 250, 500, 1000]), t = I(rnd, 3, 30); const V = D * t;
        return {q: `Une lance débite ${nb(D)} L/min pendant ${t} min. Quelle quantité d'eau a-t-elle consommée ?`, a: `${nb(V)} L`,
          w: [`${nb(V / 10)} L`, `${nb(V * 10)} L`, `${nb(D + t)} L`, `${nb(r2(D * t / 60))} L`], e: `Quantité = débit × durée = ${nb(D)} × ${t} = ${nb(V)} L.`}; },
      rnd => { const D = P(rnd, [125, 250, 500, 1000]), t = I(rnd, 4, 32, 2); const V = D * t;
        return {q: `Un engin transporte ${nb(V)} L d'eau et alimente une lance de ${nb(D)} L/min. Combien de temps peut-il l'alimenter ?`, a: `${t} min`,
          w: [`${t * 2} min`, `${t / 2} min`, `${t + 10} min`, `${hm(t * 60)}`], e: `Autonomie = volume ÷ débit = ${nb(V)} ÷ ${nb(D)} = ${t} min.`}; },
      rnd => { const V = P(rnd, [6, 9, 12, 15, 18, 24, 30, 36, 45, 60]), t = P(rnd, [10, 15, 20, 30, 60]); const D = V * 1000 / t;
        if(D !== Math.round(D)) return null;
        return {q: `Il faut vider ${V} m³ d'eau en ${t} min. Quel débit faut-il en L/min ?`, a: `${nb(D)} L/min`,
          w: [`${nb(D / 10)} L/min`, `${nb(D * 10)} L/min`, `${nb(r2(V / t))} L/min`, `${nb(D * 60)} L/min`], e: `${V} m³ = ${nb(V * 1000)} L. Débit = ${nb(V * 1000)} ÷ ${t} = ${nb(D)} L/min.`}; },
      rnd => { const p = P(rnd, [1, 3, 6]), V = P(rnd, [200, 400, 500, 1000, 1500, 2000, 3000, 4000]); const E = V * p / 100;
        return {q: `On veut ${nb(V)} L de solution moussante dosée à ${p} %. Quelle quantité d'émulseur faut-il ?`, a: `${nb(E)} L`,
          w: [`${nb(E * 10)} L`, `${nb(E / 10)} L`, `${nb(V - E)} L`, `${nb(p * 10)} L`], e: `Émulseur = ${p} % de ${nb(V)} L = ${nb(V)} × ${p} ÷ 100 = ${nb(E)} L.`}; },
      rnd => { const v = P(rnd, [4, 6, 6.8, 9]), Pb = P(rnd, [200, 300]); const A = r2(v * Pb);
        return {q: `Une bouteille de ${nb(v)} L est gonflée à ${Pb} bar. Quel volume d'air contient-elle environ (détendu à la pression atmosphérique) ?`, a: `${nb(A)} L`,
          w: [`${nb(r2(A / 10))} L`, `${nb(v + Pb)} L`, `${nb(A * 10)} L`, `${nb(r2(Pb / v))} L`], e: `Volume d'air ≈ capacité × pression = ${nb(v)} × ${Pb} = ${nb(A)} L.`}; },
      rnd => { const D1 = P(rnd, [250, 500]), n = I(rnd, 2, 4), t = I(rnd, 5, 20); const V = D1 * n * t;
        return {q: `${n} lances de ${nb(D1)} L/min fonctionnent ensemble pendant ${t} min. Quelle quantité d'eau au total ?`, a: `${nb(V)} L`,
          w: [`${nb(D1 * t)} L`, `${nb(V * 2)} L`, `${nb(D1 * n + t)} L`, `${nb(V / 10)} L`], e: `Débit total = ${n} × ${nb(D1)} = ${nb(D1 * n)} L/min. Quantité = ${nb(D1 * n)} × ${t} = ${nb(V)} L.`}; },
    ]},
    conv: {n: "Conversions", g: [
      rnd => { const v = P(rnd, [0.5, 1.5, 2, 2.5, 3.2, 4, 7.5, 12, 15, 30]);
        return {q: `Convertis ${nb(v)} m³ en litres.`, a: `${nb(v * 1000)} L`, w: [`${nb(v * 100)} L`, `${nb(v * 10)} L`, `${nb(v * 10000)} L`], e: `1 m³ = 1 000 L, donc ${nb(v)} m³ = ${nb(v)} × 1 000 = ${nb(v * 1000)} L.`}; },
      rnd => { const q = I(rnd, 1, 20) * 6; const L = q * 1000 / 60;
        return {q: `Convertis ${q} m³/h en L/min.`, a: `${nb(L)} L/min`, w: [`${nb(q * 1000)} L/min`, `${nb(q * 60)} L/min`, `${nb(r2(q / 60))} L/min`], e: `${q} m³/h = ${nb(q * 1000)} L/h. ${nb(q * 1000)} ÷ 60 = ${nb(L)} L/min.`}; },
      rnd => { const L = P(rnd, [250, 500, 1000, 1500, 2000, 3000]); const m = L * 60 / 1000;
        return {q: `Un débit de ${nb(L)} L/min, c'est combien de m³/h ?`, a: `${nb(m)} m³/h`, w: [`${nb(m * 10)} m³/h`, `${nb(r2(L / 1000))} m³/h`, `${nb(L * 60)} m³/h`], e: `${nb(L)} L/min × 60 = ${nb(L * 60)} L/h = ${nb(m)} m³/h (÷ 1 000).`}; },
      rnd => { const ha = P(rnd, [0.5, 1.2, 2, 3.5, 12, 25, 40, 150]);
        return {q: `Convertis ${nb(ha)} ha en m².`, a: `${nb(ha * 10000)} m²`, w: [`${nb(ha * 1000)} m²`, `${nb(ha * 100)} m²`, `${nb(ha * 100000)} m²`], e: `1 ha = 10 000 m², donc ${nb(ha)} ha = ${nb(ha * 10000)} m².`}; },
      rnd => { const m2 = P(rnd, [5000, 12000, 25000, 40000, 150000, 600000]);
        return {q: `Une surface de ${nb(m2)} m² a brûlé. Combien d'hectares ?`, a: `${nb(m2 / 10000)} ha`, w: [`${nb(m2 / 1000)} ha`, `${nb(m2 / 100)} ha`, `${nb(m2 / 100000)} ha`], e: `1 ha = 10 000 m², donc ${nb(m2)} ÷ 10 000 = ${nb(m2 / 10000)} ha.`}; },
      rnd => { const t = P(rnd, [0.8, 1.2, 2.4, 3.5, 7.5, 12, 19]);
        return {q: `Convertis ${nb(t)} t en kg.`, a: `${nb(t * 1000)} kg`, w: [`${nb(t * 100)} kg`, `${nb(t * 10000)} kg`, `${nb(t * 10)} kg`], e: `1 t = 1 000 kg, donc ${nb(t)} t = ${nb(t * 1000)} kg.`}; },
      rnd => { const ms = I(rnd, 5, 40, 5); const kmh = r2(ms * 3.6);
        return {q: `Convertis ${ms} m/s en km/h.`, a: `${nb(kmh)} km/h`, w: [`${nb(r2(ms / 3.6))} km/h`, `${nb(ms * 60)} km/h`, `${nb(ms * 36)} km/h`], e: `m/s × 3,6 = km/h : ${ms} × 3,6 = ${nb(kmh)} km/h.`}; },
      rnd => { const ms = I(rnd, 5, 40, 5); const kmh = r2(ms * 3.6);
        return {q: `Convertis ${nb(kmh)} km/h en m/s.`, a: `${ms} m/s`, w: [`${nb(r2(kmh * 3.6))} m/s`, `${nb(r2(kmh / 60))} m/s`, `${ms * 10} m/s`], e: `km/h ÷ 3,6 = m/s : ${nb(kmh)} ÷ 3,6 = ${ms} m/s.`}; },
      rnd => { const m = I(rnd, 1, 39) * 6 + 60 * I(rnd, 0, 3); const h = r2(m / 60); if(m % 60 === 0) return null;
        return {q: `Convertis ${hm(m)} en heures décimales.`, a: `${nb(h)} h`, w: [`${Math.floor(m / 60)},${String(m % 60).padStart(2, "0")} h`, `${nb(r2(m / 100))} h`, `${nb(h + 0.1)} h`], e: `${m % 60} min = ${m % 60} ÷ 60 = ${nb(r2((m % 60) / 60))} h. Donc ${hm(m)} = ${nb(h)} h (et non ${Math.floor(m / 60)},${String(m % 60).padStart(2, "0")} h).`}; },
      rnd => { const h = I(rnd, 1, 39) * 0.05 + I(rnd, 0, 2); const m = Math.round(h * 60); if(m % 60 === 0) return null;
        return {q: `Convertis ${nb(h)} h en heures et minutes.`, a: hm(m), w: [`${Math.floor(h)} h ${String(Math.round((h % 1) * 100)).padStart(2, "0")}`, hm(m + 6), hm(m - 3)], e: `${nb(r2(h % 1))} h × 60 = ${m % 60} min. Donc ${nb(h)} h = ${hm(m)}.`}; },
      rnd => { const km = P(rnd, [0.3, 0.75, 1.2, 2.5, 4.05, 12.5]);
        return {q: `Convertis ${nb(km)} km en mètres.`, a: `${nb(km * 1000)} m`, w: [`${nb(km * 100)} m`, `${nb(km * 10000)} m`, `${nb(km * 10)} m`], e: `1 km = 1 000 m, donc ${nb(km)} km = ${nb(km * 1000)} m.`}; },
    ]},
    vit: {n: "Vitesses et horaires", g: [
      rnd => { const v = P(rnd, [30, 45, 50, 60, 72, 80, 90, 120]), t = P(rnd, [10, 12, 15, 20, 24, 30, 40, 45]); const d = v * t / 60;
        if(d !== Math.round(d * 10) / 10) return null;
        return {q: `Un engin parcourt ${nb(d)} km en ${t} min. Quelle est sa vitesse moyenne ?`, a: `${v} km/h`, w: [`${nb(r2(d / t))} km/h`, `${nb(r2(d * t))} km/h`, `${nb(r2(v / 2))} km/h`, `${nb(v + 10)} km/h`], e: `${t} min = ${nb(r2(t / 60))} h. v = d ÷ t = ${nb(d)} ÷ ${nb(r2(t / 60))} = ${v} km/h (ou ${nb(d)} × 60 ÷ ${t}).`}; },
      rnd => { const v = P(rnd, [40, 60, 75, 80, 90, 120]), t = P(rnd, [6, 8, 9, 12, 15, 18, 20, 24]); const d = v * t / 60;
        if(d !== Math.round(d * 10) / 10) return null;
        return {q: `À ${v} km/h de moyenne, combien de temps faut-il pour faire ${nb(d)} km ?`, a: `${t} min`, w: [`${nb(r2(d / v))} min`, `${t * 2} min`, `${nb(r2(v / d))} min`], e: `t = d ÷ v = ${nb(d)} ÷ ${v} = ${nb(r2(t / 60))} h, soit ${nb(r2(t / 60))} × 60 = ${t} min.`}; },
      rnd => { const v = P(rnd, [50, 60, 80, 90, 100, 110]), t = P(rnd, [6, 12, 15, 30, 45, 90]); const d = v * t / 60;
        if(d !== Math.round(d * 10) / 10) return null;
        return {q: `Un véhicule roule ${hm(t)} à ${v} km/h. Quelle distance parcourt-il ?`, a: `${nb(d)} km`, w: [`${nb(v * t)} km`, `${nb(r2(v / t))} km`, `${nb(d * 2)} km`], e: `${hm(t)} = ${nb(r2(t / 60))} h. d = v × t = ${v} × ${nb(r2(t / 60))} = ${nb(d)} km.`}; },
      rnd => { const dep = I(rnd, 6 * 60, 22 * 60), v = P(rnd, [60, 75, 80, 90]), t = P(rnd, [12, 16, 20, 24, 30, 36]); const d = v * t / 60;
        if(d !== Math.round(d)) return null;
        return {q: `Un engin part à ${clock(dep)} et roule ${d} km à ${v} km/h de moyenne. À quelle heure arrive-t-il ?`, a: clock(dep + t), w: [clock(dep + d), clock(dep + t + 10), clock(dep + Math.round(t / 2))], e: `Durée = ${d} ÷ ${v} = ${nb(r2(t / 60))} h = ${t} min. ${clock(dep)} + ${t} min = ${clock(dep + t)}.`}; },
      rnd => { const deb = I(rnd, 18 * 60, 23 * 60 + 55, 5), dur = I(rnd, 45, 240, 5);
        return {q: `Une intervention commence à ${clock(deb)} et dure ${hm(dur)}. À quelle heure se termine-t-elle ?`, a: clock(deb + dur), w: [clock(deb + dur - 40), clock(deb + dur + 60), clock(deb + Math.floor(dur / 60) * 100 + dur % 60)], e: `${clock(deb)} + ${hm(dur)} = ${clock(deb + dur)}${deb + dur >= 1440 ? " (le lendemain, on passe minuit)" : ""}.`}; },
      rnd => { const a = I(rnd, 6 * 60, 20 * 60, 5), dur = I(rnd, 25, 300, 5);
        return {q: `Départ à ${clock(a)}, retour au centre à ${clock(a + dur)}. Combien de temps a duré la sortie ?`, a: hm(dur), w: [hm(dur + 40), hm(dur - 20), hm(dur + 60)], e: `De ${clock(a)} à ${clock(a + dur)} : ${hm(dur)}.`}; },
    ]},
    pct: {n: "Pourcentages", g: [
      rnd => { const p = P(rnd, [5, 10, 15, 20, 25, 30, 40, 75]), y = I(rnd, 2, 40) * 20; const r = y * p / 100;
        return {q: `Calcule ${p} % de ${nb(y)}.`, a: nb(r), w: [nb(r * 10), nb(r2(r / 10)), nb(y - r)], e: `${p} % de ${nb(y)} = ${nb(y)} × ${p} ÷ 100 = ${nb(r)}.`}; },
      rnd => { const p = P(rnd, [10, 20, 25, 50]), x = I(rnd, 2, 30) * 20; const r = x * (1 + p / 100);
        return {q: `Un prix de ${nb(x)} € augmente de ${p} %. Quel est le nouveau prix ?`, a: `${nb(r)} €`, w: [`${nb(x + p)} €`, `${nb(x * p / 100)} €`, `${nb(x * (1 - p / 100))} €`], e: `Augmenter de ${p} % revient à multiplier par ${nb(1 + p / 100)} : ${nb(x)} × ${nb(1 + p / 100)} = ${nb(r)} €.`}; },
      rnd => { const p = P(rnd, [10, 20, 25, 40]), x = I(rnd, 2, 30) * 20; const r = x * (1 - p / 100);
        return {q: `Un article vaut ${nb(r)} € après une remise de ${p} %. Quel était son prix avant la remise ?`, a: `${nb(x)} €`, w: [`${nb(r2(r * (1 + p / 100)))} €`, `${nb(r + p)} €`, `${nb(r2(r * (1 - p / 100)))} €`], e: `Prix remisé = prix × ${nb(1 - p / 100)}. Prix de départ = ${nb(r)} ÷ ${nb(1 - p / 100)} = ${nb(x)} € (et non ${nb(r)} + ${p} %).`}; },
      rnd => { const tot = P(rnd, [20, 25, 40, 50, 80, 200]), p = P(rnd, [5, 10, 20, 25, 30, 40, 60, 75]); const k = tot * p / 100; if(k !== Math.round(k)) return null;
        return {q: `${k} sapeurs-pompiers sur ${tot} sont de garde. Quel pourcentage cela représente-t-il ?`, a: `${p} %`, w: [`${nb(r2(tot / k))} %`, `${100 - p} %`, `${k} %`].filter(x => x !== `${p} %`), e: `${k} ÷ ${tot} = ${nb(r2(k / tot))}, soit ${p} %.`}; },
      rnd => { const a = I(rnd, 10, 60) * 10, p = P(rnd, [10, 20, 25, 50]), up = rnd() < .5; const b = a * (up ? 1 + p / 100 : 1 - p / 100);
        return {q: `Le nombre d'interventions passe de ${nb(a)} à ${nb(b)}. Quelle est l'évolution en pourcentage ?`, a: `${up ? "+" : "−"} ${p} %`, w: [`${up ? "−" : "+"} ${p} %`, `${up ? "+" : "−"} ${nb(r2(Math.abs(b - a) / b * 100), 1)} %`, `${up ? "+" : "−"} ${nb(Math.abs(b - a) / 10)} %`], e: `Évolution = (${nb(b)} − ${nb(a)}) ÷ ${nb(a)} × 100 = ${up ? "+" : "−"} ${p} %. On divise toujours par la valeur de départ.`}; },
    ]},
    geo: {n: "Surfaces et volumes", g: [
      rnd => { const L = I(rnd, 4, 30), l = I(rnd, 3, 20);
        return {q: `Un local rectangulaire mesure ${L} m sur ${l} m. Quelle est sa surface ?`, a: `${nb(L * l)} m²`, w: [`${nb(2 * (L + l))} m²`, `${nb(L + l)} m²`, `${nb(L * l * 2)} m²`], e: `Aire = longueur × largeur = ${L} × ${l} = ${nb(L * l)} m².`}; },
      rnd => { const L = I(rnd, 4, 30), l = I(rnd, 3, 20);
        return {q: `Quel est le périmètre d'un terrain rectangulaire de ${L} m sur ${l} m ?`, a: `${nb(2 * (L + l))} m`, w: [`${nb(L * l)} m`, `${nb(L + l)} m`, `${nb(4 * L)} m`], e: `Périmètre = 2 × (L + l) = 2 × (${L} + ${l}) = ${nb(2 * (L + l))} m.`}; },
      rnd => { const r = I(rnd, 2, 20); const A = r2(PI * r * r);
        return {q: `Quelle est l'aire d'un disque de ${r} m de rayon (π ≈ 3,14) ?`, a: `${nb(A)} m²`, w: [`${nb(r2(2 * PI * r))} m²`, `${nb(r2(PI * 2 * r * 2 * r))} m²`, `${nb(r2(PI * r))} m²`], e: `Aire = π × r² = 3,14 × ${r} × ${r} = ${nb(A)} m².`}; },
      rnd => { const d = I(rnd, 2, 30, 2); const C = r2(PI * d);
        return {q: `Quel est le périmètre d'un cercle de ${d} m de diamètre (π ≈ 3,14) ?`, a: `${nb(C)} m`, w: [`${nb(r2(2 * PI * d))} m`, `${nb(r2(PI * (d / 2) ** 2))} m`, `${nb(r2(PI * d / 2))} m`], e: `Périmètre = π × diamètre = 3,14 × ${d} = ${nb(C)} m (ou 2 × π × r avec r = ${d / 2}).`}; },
      rnd => { const b = I(rnd, 3, 20), h = I(rnd, 2, 15, 2);
        return {q: `Un triangle a une base de ${b} m et une hauteur de ${h} m. Quelle est son aire ?`, a: `${nb(b * h / 2)} m²`, w: [`${nb(b * h)} m²`, `${nb(b + h)} m²`, `${nb(b * h / 4)} m²`], e: `Aire = base × hauteur ÷ 2 = ${b} × ${h} ÷ 2 = ${nb(b * h / 2)} m².`}; },
      rnd => { const L = I(rnd, 2, 12), l = I(rnd, 2, 8), h = P(rnd, [0.5, 1, 1.5, 2, 2.5, 3]); const V = r2(L * l * h);
        return {q: `Un bassin mesure ${L} m × ${l} m et contient ${nb(h)} m d'eau. Combien de litres d'eau contient-il ?`, a: `${nb(V * 1000)} L`, w: [`${nb(V * 100)} L`, `${nb(V)} L`, `${nb(V * 10000)} L`], e: `Volume = ${L} × ${l} × ${nb(h)} = ${nb(V)} m³ = ${nb(V * 1000)} L.`}; },
      rnd => { const r = P(rnd, [1, 1.5, 2, 2.5, 3]), h = I(rnd, 2, 6); const V = r2(PI * r * r * h);
        return {q: `Une citerne cylindrique a un rayon de ${nb(r)} m et une hauteur de ${h} m (π ≈ 3,14). Quel est son volume ?`, a: `${nb(V)} m³`, w: [`${nb(r2(2 * PI * r * h))} m³`, `${nb(r2(PI * r * h))} m³`, `${nb(r2(PI * (2 * r) ** 2 * h))} m³`], e: `Volume = π × r² × h = 3,14 × ${nb(r)} × ${nb(r)} × ${h} = ${nb(V)} m³.`}; },
      rnd => { const r = I(rnd, 3, 30); const A = r2(PI * r * r / 2);
        return {q: `Une zone brûlée a la forme d'un demi-disque de ${r} m de rayon (π ≈ 3,14). Quelle est sa surface ?`, a: `${nb(A)} m²`, w: [`${nb(r2(PI * r * r))} m²`, `${nb(r2(PI * r))} m²`, `${nb(r2(PI * r * r / 4))} m²`], e: `Demi-disque = π × r² ÷ 2 = 3,14 × ${r}² ÷ 2 = ${nb(A)} m².`}; },
      rnd => { const L = I(rnd, 3, 10), l = I(rnd, 3, 8), h = P(rnd, [2.5, 3]); const V = r2(L * l * h);
        return {q: `Une pièce mesure ${L} m × ${l} m sur ${nb(h)} m de haut. Quel est son volume ?`, a: `${nb(V)} m³`, w: [`${nb(L * l)} m³`, `${nb(r2(2 * (L + l) * h))} m³`, `${nb(r2(L + l + h))} m³`], e: `Volume = L × l × h = ${L} × ${l} × ${nb(h)} = ${nb(V)} m³.`}; },
    ]},
    prop: {n: "Proportions et partages", g: [
      rnd => { const u = I(rnd, 3, 40) * 5, a = I(rnd, 2, 6), b = I(rnd, 3, 12); if(a === b) return null;
        return {q: `${a} tuyaux coûtent ${nb(u * a)} €. Combien coûtent ${b} tuyaux identiques ?`, a: `${nb(u * b)} €`, w: [`${nb(u * a + b)} €`, `${nb(u * a * b)} €`, `${nb(u * (b + 1))} €`], e: `Prix d'un tuyau = ${nb(u * a)} ÷ ${a} = ${nb(u)} €. ${b} tuyaux = ${b} × ${nb(u)} = ${nb(u * b)} €.`}; },
      rnd => { const p = [I(rnd, 1, 5), I(rnd, 1, 5), I(rnd, 2, 6)], k = I(rnd, 2, 20) * 10; const s = p[0] + p[1] + p[2], T = s * k, i = I(rnd, 0, 2);
        return {q: `${nb(T)} L sont partagés entre trois engins proportionnellement à ${p.join(", ")}. Combien reçoit l'engin ${["n° 1", "n° 2", "n° 3"][i]} ?`, a: `${nb(p[i] * k)} L`, w: [`${nb(r2(T / 3))} L`, `${nb(k)} L`, `${nb(p[i] * k * 2)} L`].filter(x => x !== `${nb(p[i] * k)} L`), e: `Total des parts : ${p.join(" + ")} = ${s}. Une part = ${nb(T)} ÷ ${s} = ${nb(k)} L. Engin ${i + 1} : ${p[i]} × ${nb(k)} = ${nb(p[i] * k)} L.`}; },
      rnd => { const n = I(rnd, 3, 5), v = Array.from({length: n}, () => I(rnd, 6, 19)); const s = v.reduce((a, b) => a + b, 0); const m = r2(s / n);
        return {q: `Quelle est la moyenne des notes ${v.join(" ; ")} ?`, a: nb(m), w: [nb(s), nb(r2(s / (n + 1))), nb(r2(m + 1))], e: `Somme = ${s}. Moyenne = ${s} ÷ ${n} = ${nb(m)}.`}; },
      rnd => { const den = P(rnd, [3, 4, 5, 8]), num = I(rnd, 1, den - 1), V = den * I(rnd, 2, 30) * 50;
        return {q: `On a utilisé les ${num}/${den} d'une réserve de ${nb(V)} L. Combien de litres ont été utilisés ?`, a: `${nb(V * num / den)} L`, w: [`${nb(V * (den - num) / den)} L`, `${nb(V / den)} L`, `${nb(r2(V * den / num))} L`].filter(x => x !== `${nb(V * num / den)} L`), e: `${num}/${den} de ${nb(V)} = ${nb(V)} ÷ ${den} × ${num} = ${nb(V * num / den)} L.`}; },
      rnd => { const n1 = I(rnd, 2, 6), t1 = I(rnd, 2, 9) * 10, n2 = I(rnd, 2, 8); if(n1 === n2 || (n1 * t1) % n2) return null; const t2 = n1 * t1 / n2;
        return {q: `${n1} lances de même débit vident une réserve en ${t1} min. Combien de temps mettraient ${n2} lances ?`, a: `${t2} min`, w: [`${nb(r2(t1 * n2 / n1))} min`, `${t1 + (n1 - n2) * 5} min`, `${t1} min`].filter(x => x !== `${t2} min`), e: `Proportionnalité inverse : plus de lances, moins de temps. ${n1} × ${t1} = ${n1 * t1} « minutes-lance », ÷ ${n2} = ${t2} min.`}; },
      rnd => { const V = I(rnd, 2, 40) * 10, d = P(rnd, [0.7, 0.8, 0.85, 0.9, 1.2]); const M = r2(V * d);
        return {q: `Quelle est la masse de ${V} L d'un liquide de densité ${nb(d)} ?`, a: `${nb(M)} kg`, w: [`${nb(r2(V / d))} kg`, `${V} kg`, `${nb(M * 10)} kg`], e: `Masse (kg) = volume (L) × densité = ${V} × ${nb(d)} = ${nb(M)} kg.`}; },
    ]},
  };

  // Pièges : on garde 3 valeurs différentes de la bonne réponse, complétées si besoin.
  function make(cat, rnd = Math.random){
    const c = GEN[cat]; if(!c) return null;
    for(let k = 0; k < 40; k++){
      const x = P(rnd, c.g)(rnd); if(!x) continue;
      const bad = [...new Set(x.w)].filter(w => w !== x.a && !/NaN|Infinity|undefined/.test(w) && !/^−d/.test(w));
      if(bad.length < 3) continue;
      const pick = bad.sort(() => rnd() - .5).slice(0, 3);
      return {t: "math", id: "gen-" + cat, gen: cat, q: x.q, o: [x.a, ...pick], e: x.e + " (Exercice généré : calcul vérifié par l'appli.)"};
    }
    return null;
  }
  window.MGEN = {cats: Object.fromEntries(Object.entries(GEN).map(([k, v]) => [k, v.n])), make};
})();

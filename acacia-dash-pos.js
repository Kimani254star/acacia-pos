/* Acacia POS — dashboard rebuilt to the suite design. Wraps renderDash() from app.js; the product browser stays underneath. */
(function(){
  var K = window.AcxDash, E = K.esc;  /* POS already uses a global D for its data, so the kit is K here */
  var st = document.createElement('style');
  st.textContent = '#dash>.dh,#dash>.dkpi,#dash>h3.dsec:first-of-type,#dash>.dtiles{display:none!important}#dash .ad{margin-bottom:6px}';
  document.head.appendChild(st);
  function sum(a,f){ return a.reduce(function(s,x){ return s+(Number(f(x))||0); },0); }
  var X = null; /* POS internals handed over by app.js on every render */
  function posSales(){ return ((X.D&&X.D.invoices)||[]).filter(function(i){ return i && i.source==='POS'; }); }
  function amt(n){ return K.money(n, X.cur()); }
  /* split a sale into what each payment method actually paid (change handed back comes off the cash) */
  function byMethod(list){
    var m = {};
    list.forEach(function(i){
      var tot = Number(i.totalKES)||0, t = (i.pos && i.pos.tenders) || [], non = 0, cash = 0;
      t.forEach(function(x){ var a = Number(x.a)||0; if(x.m==='Cash') cash += a; else { non += a; m[x.m] = (m[x.m]||0) + a; } });
      var c = Math.max(0, Math.min(cash, tot - non)); if(c>0) m.Cash = (m.Cash||0) + c;
    });
    return m;
  }
  function timeOf(i){ var t = i.pos && i.pos.at; if(!t) return ''; var d = new Date(t); return isNaN(d) ? '' : d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); }

  function paint(ctx){
    if(ctx) X = ctx; if(!X) return;
    var d = document.getElementById('dash'); if(!d) return;
    var host = document.getElementById('adPosMount');
    if(!host){ host = document.createElement('div'); host.id = 'adPosMount'; var dh = d.querySelector('.dh'); if(dh) dh.insertAdjacentElement('afterend', host); else d.insertBefore(host, d.firstChild); }
    var per = K.getPeriod('pos','today'), cu = K.range(per,0), pv = K.range(per,1), all = posSales();
    var sC = all.filter(function(i){return K.within(i.date,cu);}), sP = all.filter(function(i){return K.within(i.date,pv);});
    var tot = sum(sC,function(i){return i.totalKES;}), ptot = sum(sP,function(i){return i.totalKES;});
    var avg = sC.length ? tot/sC.length : 0, pavg = sP.length ? ptot/sP.length : 0;
    var vs = 'vs last ' + (per==='today'?'day':per), stk = X.dashStock(), lowN = stk.out + stk.low;
    var sh = X.myShift();

    var mm = byMethod(sC), mk = Object.keys(mm).sort(function(a,b){return mm[b]-mm[a];}), mt = sum(mk,function(k){return mm[k];});
    var colors = {'Cash':'#1b7a2f','M-Pesa':'#3b82f6','Card':'#f59e0b'}, fallback = ['#ec4899','#8b5cf6','#14b8a6'];
    var donut = mk.length ? K.donut(mk.map(function(k,i){ return {l:k,v:mm[k],t:K.pct(mm[k],mt)+'%',c:colors[k]||fallback[i%3]}; }),{center:K.pct(mm[mk[0]],mt)+'%',sub:mk[0]}) : '<div class="ad-empty">No sales in this period yet.</div>';

    var q = {}; sC.forEach(function(i){ (i.lines||[]).forEach(function(l){ var k=l.desc||l.name||'Item'; q[k]=(q[k]||0)+(Number(l.qty)||0); }); });
    var top = Object.keys(q).sort(function(a,b){return q[b]-q[a];}).slice(0,3);
    var topH = top.length ? top.map(function(k){ return '<div class="ad-rank"><div class="ad-thumb">'+K.icon('box')+'</div><span>'+E(k)+'</span><b>'+K.num(q[k])+'</b></div>'; }).join('') : '<div class="ad-empty">No product sales in this period.</div>';

    var rec = all.slice().sort(function(a,b){ return ((b.pos&&b.pos.at)||0) > ((a.pos&&a.pos.at)||0) ? 1 : -1; }).slice(0,4);
    var recH = rec.length ? '<div class="ad-list">'+rec.map(function(i){ return '<div class="ad-li"><span class="n">'+E(i.invoiceNumber||'')+'<span class="s">'+E(i.customer||'Walk-in')+'</span></span><span class="m"><b style="color:inherit">'+amt(i.totalKES)+'</b><span class="s">'+E(timeOf(i))+'</span></span></div>'; }).join('')+'</div>' : '<div class="ad-empty">Sales you ring up will show here.</div>';

    var shiftPill = K.pill(sh ? 'Shift open · '+X.cfg().till : 'No shift open', sh ? 'g' : 'o');
    host.innerHTML = '<div class="ad">'
      + K.head({icon:'cart',title:'POS Dashboard',sub:'Sell. Track. Grow.',right:shiftPill+K.periodSelect('pos',per,['today','week','month'])+'<button type="button" class="ad-cta" data-go="sell">'+K.icon('cart','style="width:15px;height:15px"')+'Start selling</button>'})
      + '<div class="ad-kpis">'
        + K.kpi({icon:'cart',color:'green',label:per==='today'?"Today's Sales":'Sales',value:amt(tot),delta:K.delta(tot,ptot,vs)})
        + K.kpi({icon:'receipt',color:'blue',label:'Transactions',value:K.num(sC.length),delta:K.delta(sC.length,sP.length,vs)})
        + K.kpi({icon:'users',color:'purple',label:'Avg. Transaction',value:amt(avg),delta:K.delta(avg,pavg,vs)})
        + K.kpi({icon:'box',color:'orange',label:'Low Stock',value:K.num(lowN)+(lowN===1?' Item':' Items'),delta:stk.out?'<div class="ad-kd dn">'+K.num(stk.out)+' out of stock</div>':''})
      + '</div>'
      + '<div class="ad-row ad-r-3">'
        + K.card('Sales by Payment Method', donut, {icon:'wallet'})
        + K.card('Top Products', topH, {icon:'tag'})
        + K.card('Recent Sales', recH, {icon:'receipt',right:'<button class="ad-link" data-go="sales">View all</button>'})
      + '</div></div>';
  }
  window.AcxPosDash = {paint:paint};
  K.onPeriod('pos', function(){ paint(); });
})();

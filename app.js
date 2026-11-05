(function(){
"use strict";
var URL_="https://xglsampckermarjpczdf.supabase.co",KEY="sb_publishable_x-dPR7pzhvJgag9soW0I8w_yfKTmi6A";
var $=function(i){return document.getElementById(i)},S=null,D={},cart=[],tenders=[],lastSale=null,term="";
var METHODS=["Cash","M-Pesa","Credit Card","Debit Card","Bank Transfer","Airtel Money","Cheque"];
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function low(s){return String(s==null?"":s).trim().toLowerCase()}
function lsg(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function lss(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function toast(m){var t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(function(){t.style.display="none"},2600)}
function dp(){return Number(D.appDecimalPlaces)>=0&&D.appDecimalPlaces!==""&&D.appDecimalPlaces!=null?Number(D.appDecimalPlaces):2}
function cur(){return D.appBaseCurrency||"KES"}
function money(n){return(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:dp(),maximumFractionDigits:dp()})}
function r2(n){var f=Math.pow(10,dp());return Math.round((Number(n)||0)*f+1e-9)/f}
function today(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
async function sha(t){var b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,"0")}).join("")}

/* ---------- Supabase (REST) ---------- */
function H(extra){return Object.assign({apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},extra||{})}
async function rest(path,opt){var r=await fetch(URL_+"/rest/v1/"+path,Object.assign({headers:H()},opt||{}));if(!r.ok&&r.status!==409){throw new Error(await r.text())}return r}
function parse(v){if(typeof v==="string"){try{return JSON.parse(v)}catch(e){return v}}return v}
async function getKey(k){var r=await rest("company_state?company_id=eq."+encodeURIComponent(S.companyId)+"&key=eq."+encodeURIComponent(k)+"&select=value,updated_at");var a=await r.json();return a[0]||null}
/* read-modify-write one key with optimistic locking; fn(currentValue)->newValue */
async function mutate(k,fn,def){
  for(var i=0;i<6;i++){
    var row=await getKey(k),cur_=row?parse(row.value):def,nv=fn(cur_==null?def:cur_),now=new Date().toISOString(),val=JSON.stringify(nv),ok;
    if(row){var r=await rest("company_state?company_id=eq."+encodeURIComponent(S.companyId)+"&key=eq."+encodeURIComponent(k)+"&updated_at=eq."+encodeURIComponent(row.updated_at),{method:"PATCH",headers:H({Prefer:"return=representation"}),body:JSON.stringify({value:val,updated_at:now})});ok=(await r.json()).length>0}
    else{var r2=await rest("company_state",{method:"POST",headers:H({Prefer:"return=representation"}),body:JSON.stringify({company_id:S.companyId,key:k,value:val,updated_at:now})});ok=r2.status<300}
    if(ok)return nv;
    await new Promise(function(z){setTimeout(z,200+Math.random()*600*(i+1))});
  }
  throw new Error("Could not save "+k+" (busy). Try again.");
}

/* ---------- login ---------- */
function companyMatch(d,rowCompany,n){n=low(n);if(!n)return false;if(low(d.companyName)===n||low(d.companyId)===n||low(rowCompany)===n)return true;return Array.isArray(d.previousCompanyNames)&&d.previousCompanyNames.some(function(x){return low(x)===n})}
async function login(){
  $("err").textContent="";var c=$("lc").value.trim(),e=low($("le").value),p=$("lp").value;
  if(!c||!e||!p){$("err").textContent="Enter company, email and password.";return}
  $("lb").disabled=true;
  try{
    var r=await rest("app_accounts?select=data,company_id&or="+encodeURIComponent("(login_id.eq."+e+",username.eq."+e+")")),rows=await r.json(),hit=null;
    for(var i=0;i<rows.length;i++){var d=Object.assign({},rows[i].data||{});d.companyId=d.companyId||rows[i].company_id;if(!companyMatch(d,rows[i].company_id,c))continue;
      var ok=false;if(d.passwordHash){ok=(await sha((d.passwordSalt||"")+":"+p))===d.passwordHash}else if(d.password!=null){ok=d.password===p}
      if(ok){hit=d;break}}
    if(!hit){$("err").textContent="Company, email or password is not correct.";return}
    S={companyId:String(hit.companyId),companyName:hit.companyName||c,name:hit.name||hit.fullName||hit.username||e,email:e,role:hit.role||""};
    lss("pos_session",S);await start();
  }catch(x){$("err").textContent="Could not reach Acacia. Check your connection."}finally{$("lb").disabled=false}
}
async function loadAll(){
  var keys="warehouses,customers,banks,orgInfo,priceList,appBaseCurrency,appDecimalPlaces,posSettings,posShifts,invoices,posPayments,appAddons,inventory,posItemImages,chartOfAccounts";
  var r1=await rest("company_state?company_id=eq."+encodeURIComponent(S.companyId)+"&select=key,value&key=in.("+keys+")"),a=await r1.json();
  var r2=await rest("company_state?company_id=eq."+encodeURIComponent(S.companyId)+"&select=key,value&key=like."+encodeURIComponent("inventory_*")),b=await r2.json();
  var n={inv:{},invKey:{}};a.concat(b).forEach(function(x){var v=parse(x.value);if(x.key.indexOf("inventory_")===0){n.inv[x.key.slice(10)]=Array.isArray(v)?v:[];n.invKey[x.key.slice(10)]=x.key}else n[x.key]=v});
  ["warehouses","customers","banks","priceList","invoices","posPayments","posShifts","chartOfAccounts"].forEach(function(k){if(!Array.isArray(n[k]))n[k]=[]});
  if(!n.orgInfo||typeof n.orgInfo!=="object")n.orgInfo={};if(!n.posItemImages||typeof n.posItemImages!=="object"||Array.isArray(n.posItemImages))n.posItemImages={};if(!n.posSettings||typeof n.posSettings!=="object")n.posSettings={};
  if(Array.isArray(n.inventory)&&n.inventory.length&&!Object.keys(n.inv).length){n.inv.Main=n.inventory;n.invKey.Main="inventory"}
  D=n;
}
async function start(){
  $("login").style.display="none";$("app").style.display="grid";
  try{await loadAll()}catch(e){toast("Could not load data: "+e.message);return}
  var a=D.appAddons&&D.appAddons.pos;if(!(a&&a.active&&(!a.until||a.until>=today()))){$("lkWhy").textContent=(a&&a.active?"Your POS access ended on "+a.until+". ":"")+(a&&a.mode?"Plan: "+(a.mode==="linked"?"Paid Books plan (KES 500/month)":"Free Books plan (KES 2,500/month)")+". ":"")+"Company ID checked: "+S.companyId;$("mLock").classList.add("on");$("lkOut").onclick=function(){localStorage.removeItem("pos_session");location.reload()};return}
  fillStatic();render();flushQueue();
}
function cfg(){var s=D.posSettings||{},l=lsg("pos_local",{});return{till:l.till||"T1",wh:l.wh||"",walk:s.walk||"Walk-in Customer",days:s.days!=null?s.days:30,neg:!!s.neg,foot:s.foot||"Thank you for shopping with us.",map:s.map||{}}}
function whList(){var w=Object.keys(D.inv);(D.warehouses||[]).forEach(function(x){var n=typeof x==="string"?x:(x&&x.name);if(n&&w.indexOf(n)<0)w.push(n)});return w}
function fillStatic(){
  $("hOrg").textContent=(D.orgInfo.name||S.companyName);var c=cfg(),w=whList();
  $("wh").innerHTML='<option value="">All warehouses</option>'+w.map(function(x){return'<option>'+esc(x)+'</option>'}).join("");
  $("wh").value=c.wh&&w.indexOf(c.wh)>-1?c.wh:"";fillCust();
}
function fillCust(){var c=cfg(),cs=(D.customers||[]).map(function(x){return x.name}).filter(Boolean),prev=$("cu").value;
  if(cs.indexOf(c.walk)<0)cs.unshift(c.walk);$("cu").innerHTML=cs.map(function(n){return'<option>'+esc(n)+'</option>'}).join("");$("cu").value=prev&&cs.indexOf(prev)>-1?prev:c.walk}

/* ---------- catalogue ---------- */
function vatInfo(v){v=low(v);if(/exempt/.test(v))return{rate:0,cat:"Exempt"};var m=v.match(/(\d+(\.\d+)?)/),r=m?parseFloat(m[1]):0;return{rate:r,cat:r===16?"General":r===8?"Other":"Zero"}}
function price(it,wh){var key=it.sku||it.name,best=null,t=today();(D.priceList||[]).forEach(function(p){if(!p||p.item!==key)return;if(p.warehouse&&wh&&p.warehouse!==wh)return;if(p.effectiveDate&&p.effectiveDate>t)return;if(!best||(p.effectiveDate||"")>=(best.effectiveDate||""))best=p});
  var v=best&&Number(best.sellingPrice)>0?Number(best.sellingPrice):Number(it.sellPrice)||0;return v}
function pending(){var m={};function add(l){var k=low(l.sku)||low(l.desc);m[k]=(m[k]||0)+(Number(l.qty)||0)}
  (D.invoices||[]).forEach(function(i){if(i&&i.source==="POS"&&!i.acx&&!i.stockDone)(i.items||[]).forEach(add)});lsg("pos_queue",[]).forEach(function(q){if(!q.invoice.stockDone)(q.invoice.items||[]).forEach(add)});return m}
function catalogue(){var out=[],pen=pending(),sel=$("wh").value,t=low(term);
  Object.keys(D.inv).forEach(function(w){if(sel&&w!==sel)return;D.inv[w].forEach(function(it){if(!it||it.active===false||!it.name)return;
    if(t&&low(it.name).indexOf(t)<0&&low(it.sku).indexOf(t)<0)return;
    var k=low(it.sku)||low(it.name),have=(Number(it.qty)||0)-(pen[k]||0);out.push({it:it,wh:w,have:have,price:price(it,w)})})});
  return out.sort(function(a,b){return a.it.name.localeCompare(b.it.name)})}
function itemImg(it){var k=it.sku||it.name,v=it.image||it.imageUrl||it.photo||it.img||it.picture||it.itemImage||(D.posItemImages||{})[k];return typeof v==="string"&&/^(data:image\/|https?:\/\/)/.test(v)?v:""}
function initials(n){var w=String(n||"?").trim().split(/\s+/);return(w[0][0]+(w[1]?w[1][0]:"")).toUpperCase()}
function catCls(c){c=low(c);return/whisk|scotch|bourbon/.test(c)?"c-whisky":/wine|champagne|prosecco/.test(c)?"c-wine":/beer|lager|stout|cider|\bale\b/.test(c)?"c-beer":/vodka/.test(c)?"c-vodka":/\bgin\b/.test(c)?"c-gin":/rum|brandy|cognac|tequila|liqueur/.test(c)?"c-rum":""}
function pfmt(n){n=Number(n)||0;var s=Number.isInteger(n)?n.toLocaleString():money(n),k=cur();return(k==="KES"?"KSh":k)+"\u00a0"+s}
function renderGrid(){var c=cfg(),all=catalogue(),list=all.slice(0,300);
  if($("count"))$("count").textContent=all.length+(all.length===1?" product":" products");
  $("grid").innerHTML=list.length?list.map(function(x,i){
    var it=x.it,o=x.have<=0&&!c.neg,im=itemImg(it),
      cat=it.category||it.itemCategory||it.group||"",size=it.size||it.unit||it.uom||"",
      abv=it.abv!=null&&String(it.abv)!==""?it.abv:"",
      old=Number(it.oldPrice||it.listPrice||it.wasPrice)||0,off=old>x.price&&x.price>0?Math.round((old-x.price)/old*100):0,
      meta=[cat,size].filter(Boolean).map(esc).join(" \u00b7 ")||(esc(it.sku||"")+(x.wh?(it.sku?" \u00b7 ":"")+esc(x.wh):"")),
      tag=x.have<=0?'<span class="tag out">Out of stock</span>':x.have<=5?'<span class="tag low">Only '+x.have+' left</span>':'<span class="tag ok">'+x.have+' in stock</span>';
    return'<div class="p'+(o?" out":"")+'" data-i="'+i+'">'
      +'<div class="im'+(im?' has':'')+'">'+(im?'<img loading="lazy" title="Tap to view picture" src="'+esc(im)+'" alt="">':'<span class="ini">'+esc(initials(it.name))+'</span>')
      +(off?'<span class="off">-'+off+'%</span>':'')
      +(abv!==""?'<span class="abv">'+esc(abv)+'<small>%</small></span>':'')
      +'<span class="cam" data-cam="'+i+'" title="Add or change picture">\ud83d\udcf7</span></div>'
      +'<div class="bd"><div class="cat '+catCls(cat)+'">'+meta+'</div>'
      +'<h3 class="n">'+esc(it.name)+'</h3>'
      +'<div class="pr-row"><span class="pr">'+pfmt(x.price)+'</span>'+(off?'<s class="was">'+pfmt(old)+'</s>':'')+tag+'</div>'
      +'<button type="button" class="add"'+(o?' disabled':'')+'>'+(o?'Out of stock':'+ Add to cart')+'</button></div></div>'}).join(""):'<div class="empty">No items found. Items come from Inventory in Acacia Books.</div>';
  $("grid").onclick=function(e){var cm=e.target.closest(".cam");if(cm){e.stopPropagation();pickImg(list[+cm.dataset.cam]);return}var b=e.target.closest(".p");if(b&&e.target.closest(".im.has")){e.stopPropagation();viewImg(list[+b.dataset.i]);return}if(b&&!b.classList.contains("out"))addToCart(list[+b.dataset.i])};
  renderGrid.list=list}
var imgKey="",viewing=null;
function viewImg(x){if(!x)return;var u=itemImg(x.it);if(!u)return;viewing=x;$("imgBig").src=u;$("imgBig").alt=x.it.name||"";$("imgTitle").textContent=x.it.name||"";open_("mImg")}
document.addEventListener("click",function(e){var t=e.target;if(!t||!t.id)return;
  if(t.id==="mImg"){close_();return}
  if(t.id==="imgChange"){var x=viewing;close_();pickImg(x);return}
  if(t.id==="imgAdd"){var y=viewing;close_();addToCart(y)}});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&$("mImg")&&$("mImg").classList.contains("on"))close_()});
function pickImg(x){if(!x)return;imgKey=x.it.sku||x.it.name;var f=$("imgPick");f.value="";f.click()}
function shrink(file,max){return new Promise(function(res,rej){var r=new FileReader();r.onerror=function(){rej(new Error("Could not read the picture"))};r.onload=function(){var im=new Image();im.onerror=function(){rej(new Error("That file is not a picture"))};im.onload=function(){var s=Math.min(1,max/Math.max(im.width,im.height)),cv=document.createElement("canvas");cv.width=Math.max(1,Math.round(im.width*s));cv.height=Math.max(1,Math.round(im.height*s));var cx=cv.getContext("2d");cx.fillStyle="#fff";cx.fillRect(0,0,cv.width,cv.height);cx.imageSmoothingQuality="high";cx.drawImage(im,0,0,cv.width,cv.height);res(cv.toDataURL("image/jpeg",.82))};im.src=r.result};r.readAsDataURL(file)})}
document.addEventListener("change",function(e){if(!e.target||e.target.id!=="imgPick")return;var f=e.target.files&&e.target.files[0];if(!f||!imgKey)return;var k=imgKey;
  shrink(f,800).then(function(url){return mutate("posItemImages",function(cur){cur=(cur&&typeof cur==="object"&&!Array.isArray(cur))?cur:{};cur[k]=url;return cur},{}).then(function(nv){D.posItemImages=nv;renderGrid();toast("Picture saved")})}).catch(function(err){toast(err.message||"Could not save the picture")})});

/* ---------- cart ---------- */
function addToCart(x){if(!x)return;var c=cfg(),k=low(x.it.sku)+"|"+low(x.it.name)+"|"+x.wh,l=cart.find(function(z){return z.k===k});
  var q=(l?l.qty:0)+1;if(!c.neg&&q>x.have){toast("Only "+Math.max(x.have,0)+" in stock");return}
  if(l)l.qty=q;else{var v=vatInfo(x.it.sellVat);cart.push({k:k,name:x.it.name,sku:x.it.sku||"",wh:x.wh,price:x.price,qty:1,disc:0,rate:v.rate,cat:v.cat,acct:x.it.sellingAccount||"",have:x.have})}renderCart()}
function calc(){var sub=0,dis=0,vat=0,gen=0,oth=0,zero=0,ex=0;
  var lines=cart.map(function(l){var q=Number(l.qty)||0,p=Number(l.price)||0,d=Number(l.disc)||0,net=p*(1-d/100)*q,v=net*l.rate/100;sub+=p*q;dis+=p*(d/100)*q;vat+=v;
    if(l.cat==="General")gen+=net;else if(l.cat==="Other")oth+=net;else if(l.cat==="Zero")zero+=net;else ex+=net;
    return{desc:l.name,sku:l.sku,warehouse:l.wh,qty:q,price:p,discount:d,vatRate:l.rate,category:l.cat,subtotal:net,vat:v,totalWithVat:net+v,type:"product",_acct:l.acct}});
  return{lines:lines,sub:sub,dis:dis,vat:vat,total:sub-dis+vat,gen:gen,oth:oth,zero:zero,ex:ex}}
function renderCart(){var c=calc();
  $("cart").innerHTML=cart.length?cart.map(function(l,i){var t=c.lines[i];return'<div class="line"><span class="t">'+esc(l.name)+'</span><span class="a">'+money(t.totalWithVat)+'</span><div class="c"><button class="q" data-a="m" data-i="'+i+'">−</button><input class="qty" type="number" min="0" step="any" value="'+l.qty+'" data-a="q" data-i="'+i+'"><button class="q" data-a="p" data-i="'+i+'">+</button>× '+money(l.price)+' <input class="dsc" type="number" min="0" max="100" value="'+l.disc+'" data-a="d" data-i="'+i+'" title="Discount %">% off'+(l.rate?" · VAT "+l.rate+"%":"")+' <button class="q" data-a="x" data-i="'+i+'" title="Remove">✕</button></div></div>'}).join(""):'<div class="empty">Tap an item or scan a SKU to start a sale.</div>';
  $("tSub").textContent=money(c.sub);$("tDis").textContent=money(c.dis);$("tVat").textContent=money(c.vat);$("tTot").textContent=cur()+" "+money(c.total);$("bPay").disabled=!cart.length;var sb=$("bSell");if(sb)sb.textContent="🛒 Sell"+(cart.length?" ("+cart.length+")":"")}
$("cart").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var i=+b.dataset.i,l=cart[i];if(!l)return;var a=b.dataset.a;
  if(a==="x")cart.splice(i,1);else if(a==="p"){if(!cfg().neg&&l.qty+1>l.have){toast("Only "+Math.max(l.have,0)+" in stock");return}l.qty++}else if(a==="m"){l.qty--;if(l.qty<=0)cart.splice(i,1)}renderCart()});
$("cart").addEventListener("change",function(e){var t=e.target,i=+t.dataset.i,l=cart[i];if(!l)return;var v=parseFloat(t.value)||0;
  if(t.dataset.a==="q"){if(v<=0){cart.splice(i,1)}else if(!cfg().neg&&v>l.have){toast("Only "+Math.max(l.have,0)+" in stock");l.qty=Math.max(l.have,0)||1}else l.qty=v}
  else if(t.dataset.a==="d")l.disc=Math.min(Math.max(v,0),100);renderCart()});
function render(){renderGrid();renderCart();hdr()}
$("q").addEventListener("input",function(){term=this.value;renderGrid()});
$("q").addEventListener("keydown",function(e){if(e.key!=="Enter")return;var t=low(this.value);if(!t)return;
  var all=catalogue(),hit=all.find(function(x){return low(x.it.sku)===t})||(all.length===1?all[0]:null);if(hit){addToCart(hit);this.value="";term="";renderGrid()}else toast("No exact SKU match")});
$("wh").addEventListener("change",renderGrid);
$("bClr").onclick=function(){if(cart.length&&confirm("Clear this sale?")){cart=[];renderCart()}};
$("bHold").onclick=function(){if(!cart.length)return;var h=lsg("pos_held",[]);h.push({id:Date.now(),at:new Date().toISOString(),customer:$("cu").value,cart:cart});lss("pos_held",h);cart=[];renderCart();toast("Sale held")};
$("bHeld").onclick=function(){var h=lsg("pos_held",[]);$("hdBody").innerHTML=h.length?h.map(function(x){return'<div class="row"><span style="flex:1">'+new Date(x.at).toLocaleTimeString()+" · "+x.cart.length+" line(s) · "+esc(x.customer)+'</span><button class="btn" data-r="'+x.id+'">Recall</button><button class="btn alt" data-d="'+x.id+'">Delete</button></div>'}).join(""):'<div class="empty">Nothing on hold.</div>';open_("mHeld")};
$("hdBody").onclick=function(e){var b=e.target.closest("button");if(!b)return;var h=lsg("pos_held",[]),id=b.dataset.r||b.dataset.d,x=h.find(function(z){return String(z.id)===id});if(!x)return;
  if(b.dataset.r){if(cart.length&&!confirm("Replace the current sale?"))return;cart=x.cart;$("cu").value=x.customer;close_();setView("sell")}lss("pos_held",h.filter(function(z){return z!==x}));renderCart();if(!b.dataset.r)$("bHeld").onclick()};

/* ---------- modals ---------- */
function open_(id){$(id).classList.add("on")}function close_(){document.querySelectorAll(".modal.on").forEach(function(m){m.classList.remove("on")})}
document.addEventListener("click",function(e){if(e.target.hasAttribute&&e.target.hasAttribute("data-x"))close_()});

/* ---------- payment ---------- */
var saleType="cash",termsDays=30;
function addDays(d,n){var x=new Date(d+"T00:00:00");x.setDate(x.getDate()+(Number(n)||0));var p=function(v){return String(v).padStart(2,"0")};return x.getFullYear()+"-"+p(x.getMonth()+1)+"-"+p(x.getDate())}
/* Sales account: Income accounts from the Books Chart of Accounts, each listed once */
var INCOME_TYPES=["income","sales","other income","interest income","commission income","service revenue","revenue"];
function incomeAccounts(){var seen={},out=[];(D.chartOfAccounts||[]).forEach(function(a){if(!a||!a.name)return;var cat=low(a.category),ty=low(a.type);if(!(cat==="income"||cat==="revenue"||INCOME_TYPES.indexOf(ty)>-1))return;var k=low(a.name);if(seen[k])return;seen[k]=1;out.push({name:a.name,code:a.code||""})});return out.sort(function(x,y){return String(x.code||x.name).localeCompare(String(y.code||y.name),undefined,{numeric:true})})}
function drawAcct(){var list=incomeAccounts(),row=$("pAcctRow");if(!list.length){row.style.display="none";return}
  var saved=lsg("pos_acct_"+S.companyId,""),want=saved,names=list.map(function(x){return x.name});
  if(names.indexOf(want)<0){want="";for(var i=0;i<cart.length;i++){if(cart[i].acct&&names.indexOf(cart[i].acct)>-1){want=cart[i].acct;break}}}
  if(!want){var s=list.filter(function(x){return/sales/i.test(x.name)})[0];want=(s||list[0]).name}
  $("pAcct").innerHTML=list.map(function(x){return"<option value=\""+esc(x.name)+"\""+(x.name===want?" selected":"")+">"+esc(x.name)+(x.code?" ("+esc(x.code)+")":"")+"</option>"}).join("");row.style.display=""}
$("pAcct").addEventListener("change",function(){lss("pos_acct_"+S.companyId,this.value)});
function defBank(m){var c=cfg();return c.map[m]||c.map.Cash||""}
function bankNames(){return(D.banks||[]).map(function(b,i){return{i:i,n:(b&&(b.name||b.bankName||b.accountName))||("Fund "+(i+1))}})}
function total(){return r2(calc().total)}
$("bPay").onclick=function(){if(!cart.length)return;if(!shiftOpen()){toast("Open a shift first (Shift button)");return}saleType="cash";termsDays=cfg().days>0?cfg().days:30;tenders=[{m:"Cash",a:total(),ref:"",b:defBank("Cash")}];drawAcct();drawPay();open_("mPay")};
function drawPay(){var t=total(),cr=saleType==="credit";$("pDue").textContent=cur()+" "+money(t);
  document.querySelectorAll("#pType button").forEach(function(b){b.classList.toggle("on",b.dataset.t===saleType)});$("pTermsBox").style.display=cr?"":"none";$("pExact").style.display=cr?"none":"";$("pAdd").textContent=cr?"+ Deposit / part payment":"+ Add payment method";
  var known=["0","7","15","30","45","60","90"],tv=String(termsDays);$("pTerms").value=known.indexOf(tv)>-1?tv:"x";$("pTermsDays").style.display=known.indexOf(tv)>-1?"none":"";if(known.indexOf(tv)<0)$("pTermsDays").value=termsDays;$("pDueOn").textContent=cr?(termsDays>0?"Due on "+addDays(today(),termsDays):"Due on receipt"):"";
  $("pRows").innerHTML=tenders.map(function(x,i){return'<div class="tender"><select data-i="'+i+'" data-k="m">'+METHODS.map(function(m){return'<option'+(m===x.m?" selected":"")+">"+m+"</option>"}).join("")+'</select><input type="number" step="any" min="0" data-i="'+i+'" data-k="a" value="'+x.a+'">'+(x.m==="Cash"?"":'<input data-i="'+i+'" data-k="ref" placeholder="Reference" value="'+esc(x.ref)+'">')+('<select class="fund" data-i="'+i+'" data-k="b"><option value="">— Fund / bank —</option>'+bankNames().map(function(b){return'<option'+(b.n===x.b?" selected":"")+">"+esc(b.n)+"</option>"}).join("")+"</select>")+'<button class="q" data-rm="'+i+'">✕</button></div>'}).join("");sumPay()}
function sumPay(){var t=total(),paid=0,cashIn=0,cr=saleType==="credit";
  tenders.forEach(function(x){var v=Number(x.a)||0;paid+=v;if(x.m==="Cash")cashIn+=v});
  var acct=cr?Math.max(r2(t-paid),0):0,change=cr?0:Math.max(r2(paid-t),0),msg="";
  if(!cr){if(change>cashIn)msg="Only cash can give change.";var sh=r2(t-paid);if(sh>0)msg="Short by "+money(sh)}
  else{if(r2(paid-t)>0)msg="Deposit is more than the total";if(low($("cu").value)===low(cfg().walk))msg="Pick a named customer for a credit sale.";if(!(termsDays>=0))msg="Enter the terms in days"}
  if(!msg&&bankNames().length){var nf=tenders.filter(function(x){return(Number(x.a)||0)>0&&!x.b})[0];if(nf)msg="Pick the bank / fund from Books for "+nf.m}
  $("pLbl").textContent=cr?"On account":"Change";$("pPaid").textContent=money(paid);$("pChg").textContent=money(cr?acct:change);$("pMsg").textContent=msg;$("pOk").disabled=!!msg;pay.change=change;pay.acct=acct;pay.msg=msg}
var pay={};
$("pRows").addEventListener("input",function(e){var t=e.target,x=tenders[+t.dataset.i];if(!x)return;x[t.dataset.k]=t.dataset.k==="a"?parseFloat(t.value)||0:t.value;sumPay()});
$("pRows").addEventListener("change",function(e){var t=e.target;if(t.dataset.k==="m"){tenders[+t.dataset.i].m=t.value;tenders[+t.dataset.i].b=defBank(t.value);drawPay()}});
$("pRows").addEventListener("click",function(e){var b=e.target.closest("[data-rm]");if(b){tenders.splice(+b.dataset.rm,1);if(!tenders.length&&saleType!=="credit")tenders=[{m:"Cash",a:0,ref:"",b:defBank("Cash")}];drawPay()}});
$("pAdd").onclick=function(){var paid=tenders.reduce(function(s,x){return s+(Number(x.a)||0)},0);tenders.push({m:saleType==="credit"?"Cash":"M-Pesa",a:saleType==="credit"?0:Math.max(r2(total()-paid),0),ref:"",b:defBank(saleType==="credit"?"Cash":"M-Pesa")});drawPay()};
$("pType").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;saleType=b.dataset.t;if(saleType==="credit"){tenders=[];if(!(termsDays>0))termsDays=cfg().days>0?cfg().days:30}else{tenders=[{m:"Cash",a:total(),ref:"",b:defBank("Cash")}]}drawPay()});
$("pTerms").addEventListener("change",function(){if(this.value==="x"){$("pTermsDays").style.display="";$("pTermsDays").focus();termsDays=parseInt($("pTermsDays").value,10)||0}else termsDays=parseInt(this.value,10);drawPay()});
$("pTermsDays").addEventListener("input",function(){termsDays=parseInt(this.value,10);$("pDueOn").textContent=termsDays>0?"Due on "+addDays(today(),termsDays):"Due on receipt";sumPay()});
$("pExact").onclick=function(){tenders=[{m:"Cash",a:total(),ref:"",b:defBank("Cash")}];drawPay()};

/* ---------- sale ---------- */
function nextNumber(till){var pre="POS"+till.replace(/[^A-Za-z0-9]/g,"")+"-",mx=0;
  (D.invoices||[]).concat(lsg("pos_queue",[]).map(function(q){return q.invoice})).forEach(function(i){var n=String(i&&(i.posRef||i.invoiceNumber)||"");if(n.indexOf(pre)===0){var v=parseInt(n.slice(pre.length),10);if(v>mx)mx=v}});
  var l=lsg("pos_counter_"+S.companyId+pre,0);return pre+String(Math.max(mx,l)+1).padStart(5,"0")}
$("pOk").onclick=async function(){
  if(pay.msg)return;var btn=this;btn.disabled=true;var c=cfg(),cs=calc(),t=total(),now=new Date(),date=today(),acctSum=0,paid=0,cashIn=0;
  tenders.forEach(function(x){var a=Number(x.a)||0;if(x.m==="On account")acctSum+=a;else{paid+=a;if(x.m==="Cash")cashIn+=a}});
  var change=pay.change||0,applied=r2(paid-change),no=nextNumber(c.till),acct="";
  if($("pAcctRow").style.display!=="none"&&$("pAcct").value)acct=$("pAcct").value;else for(var i=0;i<cs.lines.length;i++){if(cs.lines[i]._acct){acct=cs.lines[i]._acct;break}}
  var credit=saleType==="credit",nd=credit?(termsDays>0?termsDays:0):0,due=addDays(date,nd),got=r2(paid-change),bal=Math.max(r2(cs.total-got),0),st=bal<=0?"Paid":(got>0?"Partial":"Unpaid");acctSum=pay.acct||0;
  var dpl=dp(),id=Number(String(Date.now())+String(Math.floor(Math.random()*90)+10));
  var inv={id:id,invoiceNumber:no,date:date,customer:$("cu").value,netDays:nd,dueDate:due,saleType:credit?"Credit":"Cash",account:acct,salesPerson:S.name,lpo:"",
    items:cs.lines.map(function(l){var o=Object.assign({},l);delete o._acct;return o}),total:cs.total.toFixed(dpl),discount:cs.dis.toFixed(dpl),vat:cs.vat.toFixed(dpl),
    salesGeneral:cs.gen.toFixed(dpl),salesOther:cs.oth.toFixed(dpl),salesZero:cs.zero.toFixed(dpl),salesExempt:cs.ex.toFixed(dpl),currency:cur(),exchangeRate:1,totalKES:r2(cs.total),paid:st==="Paid",status:st,amountPaid:got,balance:bal,source:"POS",
    pos:{saleType:credit?"Credit":"Cash",till:c.till,cashier:S.name,at:now.toISOString(),tenders:tenders.map(function(x){return{m:x.m,a:Number(x.a)||0,ref:x.ref||"",bank:x.b||""}}),change:change}};
  if(acctSum>0&&paid>0){}
  var pays=[],left=applied;
  tenders.forEach(function(x,i){if(x.m==="On account")return;var a=Number(x.a)||0;if(x.m==="Cash")a=Math.max(r2(a-change),0);if(a<=0)return;a=Math.min(a,left);left=r2(left-a);
    var bank=(x.b||c.map[x.m]||c.map.Cash||"");pays.push({id:id+"-"+i,invoiceId:id,invoiceNumber:no,date:date,amount:a,method:x.m,bank:bank,reference:no+(x.ref?" "+x.ref:""),status:"pending",app:"POS"})});
  var rec={invoice:inv,pays:pays,customer:inv.customer,walk:inv.customer===c.walk};
  var q=lsg("pos_queue",[]);q.push(rec);lss("pos_queue",q);lss("pos_counter_"+S.companyId+"POS"+c.till.replace(/[^A-Za-z0-9]/g,"")+"-",parseInt(no.split("-").pop(),10));
  lastSale={inv:inv,paid:paid,change:change,tendered:paid};
  cart=[];renderCart();close_();$("dTot").textContent=cur()+" "+money(cs.total);$("dChg").textContent=money(change);open_("mDone");$("dNote").textContent="Saving to Acacia Books…";btn.disabled=false;
  var ok=await flushQueue();$("dNote").textContent=ok?"Saved to Acacia Books. Stock updated; the ledger posts when Books next opens.":"No connection. The sale is saved on this device and will upload automatically.";
};
$("dNew").onclick=function(){close_();$("q").focus()};
$("dPrint").onclick=async function(){if(!lastSale)return;try{await flushQueue();await loadAll()}catch(e){}printReceipt(lastSale.inv)};
var flushing=false;
/* Stock is taken off in the warehouse the item was sold from, as soon as the sale uploads (same cloud stock Books and Inventory read).
 * Batches: earliest expiry first, same as Books. Books is told (invoice.stockDone) so it never deducts the same sale again. */
function deductArr(arr,lines){lines.forEach(function(l){var k=low(l.sku),nm=low(l.desc);
    var it=arr.filter(function(x){return x&&(k&&x.sku?low(x.sku)===k:low(x.name)===nm)})[0];if(!it)return;
    var q=Number(l.qty)||0;it.qty=Math.max((parseFloat(it.qty)||0)-q,0);
    if(Array.isArray(it.batches)&&it.batches.length){var left=q,ex=function(b){return b.expiryDate||b.expiry||""};
      it.batches.filter(function(b){return(parseFloat(b.qty)||0)>0}).sort(function(x,y){var p=ex(x),r=ex(y);return p||r?p?r?new Date(p)-new Date(r):-1:1:0}).forEach(function(b){if(left<=1e-7)return;var t=Math.min(parseFloat(b.qty)||0,left);b.qty=(parseFloat(b.qty)||0)-t;left-=t})}});
  return arr}
function saveRec(r){var qq=lsg("pos_queue",[]);qq.forEach(function(x,i){if(x.invoice.id===r.invoice.id)qq[i]=r});lss("pos_queue",qq)}
async function deductStock(r){if(r.invoice.stockDone)return;r.stk=r.stk||{};var by={};
  (r.invoice.items||[]).forEach(function(l){if(l&&(!l.type||low(l.type)==="product")){var w=l.warehouse||"Main";(by[w]=by[w]||[]).push(l)}});
  for(var w in by){if(r.stk[w])continue;var key=(D.invKey||{})[w];
    if(key){await mutate(key,function(a){return deductArr(Array.isArray(a)?a:[],by[w])},[])}
    r.stk[w]=1;saveRec(r)}
  r.invoice.stockDone=true;saveRec(r)}
async function flushQueue(){if(flushing||!S)return true;var q=lsg("pos_queue",[]);if(!q.length){hdr();return true}flushing=true;var ok=true;
  try{for(var i=0;i<q.length;i++){var r=q[i];
    await deductStock(r);
    await mutate("invoices",function(a){a=Array.isArray(a)?a:[];if(!a.some(function(x){return x&&x.id===r.invoice.id}))a.push(r.invoice);return a},[]);
    if(r.pays.length)await mutate("posPayments",function(a){a=Array.isArray(a)?a:[];r.pays.forEach(function(p){if(!a.some(function(x){return x&&x.id===p.id}))a.push(p)});return a},[]);
    var cur2=lsg("pos_queue",[]).filter(function(x){return x.invoice.id!==r.invoice.id});lss("pos_queue",cur2)}
  }catch(e){ok=false}finally{flushing=false}
  if(ok){try{await loadAll();renderGrid()}catch(e){}}hdr();return ok}
setInterval(function(){if(S){flushQueue();if(!lsg("pos_queue",[]).length&&!cart.length)loadAll().then(function(){fillCust();renderGrid();hdr()}).catch(function(){})}},60000);
window.addEventListener("online",function(){flushQueue()});

/* ---------- shifts ---------- */
function myShift(){var c=cfg();return(D.posShifts||[]).find(function(s){return s&&!s.closedAt&&s.till===c.till})}
function shiftOpen(){return!!myShift()}
function hdr(){var s=myShift(),q=lsg("pos_queue",[]).length;$("hShift").textContent=s?("Shift open · "+cfg().till):"No shift open";$("hNet").textContent=q?q+" waiting to upload":(navigator.onLine?"Online":"Offline");renderDash()}
function shiftSales(s){return(D.invoices||[]).filter(function(i){return i&&i.source==="POS"&&i.pos&&i.pos.till===s.till&&i.pos.at>=s.openedAt&&(!s.closedAt||i.pos.at<=s.closedAt)})}
function cashIn(list){var t=0;list.forEach(function(i){var cash=0,tend=0;(i.pos.tenders||[]).forEach(function(x){if(x.m==="Cash")cash+=Number(x.a)||0});t+=cash-(Number(i.pos.change)||0)});return r2(t)}
$("bShift").onclick=function(){var s=myShift(),h="";
  if(!s)h='<div class="row"><label>Opening cash</label><input id="shF" type="number" min="0" step="any" value="0"></div><button class="btn gold" id="shGo">Open shift</button>';
  else{var l=shiftSales(s),exp=r2((Number(s.openingFloat)||0)+cashIn(l)),tot=l.reduce(function(a,i){return a+(Number(i.totalKES)||0)},0);
    h='<p>Opened '+new Date(s.openedAt).toLocaleString()+' by '+esc(s.cashier)+'</p><table><tr><td>Sales</td><td class="r">'+l.length+'</td></tr><tr><td>Total sold</td><td class="r">'+money(tot)+'</td></tr><tr><td>Opening cash</td><td class="r">'+money(s.openingFloat)+'</td></tr><tr><td>Expected cash in drawer</td><td class="r"><b>'+money(exp)+'</b></td></tr></table><div class="row"><label>Counted cash</label><input id="shC" type="number" min="0" step="any"></div><button class="btn bad" id="shGo">Close shift</button>'}
  $("shBody").innerHTML=h;open_("mShift");
  $("shGo").onclick=async function(){this.disabled=true;try{
    if(!s){var f=parseFloat($("shF").value)||0,n={id:Date.now(),till:cfg().till,cashier:S.name,openedAt:new Date().toISOString(),openingFloat:f};await mutate("posShifts",function(a){a=Array.isArray(a)?a:[];a.push(n);return a},[])}
    else{var cc=parseFloat($("shC").value);if(isNaN(cc)){toast("Enter the counted cash");this.disabled=false;return}var l2=shiftSales(s),ex=r2((Number(s.openingFloat)||0)+cashIn(l2));
      await mutate("posShifts",function(a){a=Array.isArray(a)?a:[];a.forEach(function(x){if(x.id===s.id){x.closedAt=new Date().toISOString();x.counted=cc;x.expected=ex;x.variance=r2(cc-ex);x.closedBy=S.name}});return a},[]);toast("Shift closed. Variance "+money(cc-ex))}
    await loadAll();hdr();close_()}catch(e){toast(e.message);this.disabled=false}}};

/* ---------- today ---------- */
$("bToday").onclick=function(){var c=cfg(),t=today(),l=(D.invoices||[]).filter(function(i){return i&&i.source==="POS"&&i.date===t}).sort(function(a,b){return String(b.pos&&b.pos.at).localeCompare(String(a.pos&&a.pos.at))}),by={},tot=0;
  l.forEach(function(i){tot+=Number(i.totalKES)||0;(i.pos&&i.pos.tenders||[]).forEach(function(x){by[x.m]=(by[x.m]||0)+(Number(x.a)||0)-(x.m==="Cash"?Number(i.pos.change)||0:0)})});
  $("tdBody").innerHTML='<p><b>'+l.length+' sale(s)</b> · total '+cur()+' '+money(tot)+'</p><p>'+Object.keys(by).map(function(k){return esc(k)+": "+money(by[k])}).join(" · ")+'</p><table><tr><th>No.</th><th>Time</th><th>Till</th><th>Customer</th><th class="r">Total</th><th></th></tr>'+l.map(function(i,n){return'<tr><td>'+esc(i.invoiceNumber)+'</td><td>'+(i.pos?new Date(i.pos.at).toLocaleTimeString():"")+'</td><td>'+esc(i.pos&&i.pos.till)+'</td><td>'+esc(i.customer)+'</td><td class="r">'+money(i.totalKES)+'</td><td><button class="btn alt" data-p="'+n+'">Reprint</button></td></tr>'}).join("")+'</table>';
  $("tdBody").onclick=function(e){var b=e.target.closest("[data-p]");if(b)printReceipt(l[+b.dataset.p])};open_("mToday")};


/* ---------- reports (top bar > Reports) ---------- */
function ymd(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function repRange(days){var e=new Date(),s=new Date();s.setDate(s.getDate()-days);$("rFrom").value=ymd(s);$("rTo").value=ymd(e);renderRep()}
function renderRep(){var f=$("rFrom").value||today(),t=$("rTo").value||today(),by={},items={},days={},tot=0,vat=0,n=0;
  var l=(D.invoices||[]).filter(function(i){return i&&i.source==="POS"&&i.date>=f&&i.date<=t});
  l.forEach(function(i){n++;tot+=Number(i.totalKES)||0;vat+=Number(i.vatKES||i.vat)||0;days[i.date]=days[i.date]||{n:0,t:0};days[i.date].n++;days[i.date].t+=Number(i.totalKES)||0;
    (i.pos&&i.pos.tenders||[]).forEach(function(x){by[x.m]=(by[x.m]||0)+(Number(x.a)||0)-(x.m==="Cash"?Number(i.pos.change)||0:0)});
    (i.items||[]).forEach(function(x){var k=x.desc||"Item";items[k]=items[k]||{q:0,t:0};items[k].q+=Number(x.qty)||0;items[k].t+=Number(x.totalWithVat)||0})});
  var top=Object.keys(items).sort(function(a,b){return items[b].t-items[a].t}).slice(0,15);
  $("rBody").innerHTML='<p><b>'+n+' sale(s)</b> · total '+cur()+' '+money(tot)+(n?' · average '+money(tot/n):'')+'</p>'
   +'<h3>By payment method</h3><p>'+(Object.keys(by).length?Object.keys(by).map(function(k){return esc(k)+": "+money(by[k])}).join(" · "):"No payments in this period")+'</p>'
   +'<h3>By day</h3><table><tr><th>Date</th><th class="r">Sales</th><th class="r">Total</th></tr>'+Object.keys(days).sort().map(function(d){return'<tr><td>'+esc(d)+'</td><td class="r">'+days[d].n+'</td><td class="r">'+money(days[d].t)+'</td></tr>'}).join("")+'</table>'
   +'<h3>Top items</h3><table><tr><th>Item</th><th class="r">Qty</th><th class="r">Total</th></tr>'+top.map(function(k){return'<tr><td>'+esc(k)+'</td><td class="r">'+items[k].q+'</td><td class="r">'+money(items[k].t)+'</td></tr>'}).join("")+'</table>'}
$("bRep").onclick=function(){repRange(0);open_("mRep")};
$("rFrom").onchange=$("rTo").onchange=renderRep;
document.querySelector("#mRep").addEventListener("click",function(e){var b=e.target.closest("[data-rq]");if(b)repRange(+b.dataset.rq)});

/* ---------- receipt ---------- */
function qrSvg(t){try{var q=qrcode(0,"M");q.addData(String(t));q.make();return q.createSvgTag({cellSize:3,margin:0,scalable:true})}catch(e){return""}}
function fiscalBlock(inv){var e=inv.etims;
  if(e&&(e.qrText||inv.qrText)){var t=e.qrText||inv.qrText,svg=qrSvg(t);
    return"<hr><p><b>KRA eTIMS</b></p>"+(svg?'<div style="width:38mm;margin:4px auto">'+svg+"</div>":"")+(e.controlUnitNo?"<p>Control Unit: "+esc(e.controlUnitNo)+"</p>":"")+(e.invoiceNo?"<p>Fiscal Inv No: "+esc(e.invoiceNo)+"</p>":"")+(e.scuDate?"<p>SCU Date: "+esc(e.scuDate)+"</p>":"")+(e.receiptSignature?'<p style="word-break:break-all">Signature: '+esc(e.receiptSignature)+"</p>":"")+"<p>Scan to verify with KRA</p>"}
  return"<hr><p>eTIMS QR pending - reprint from Today's sales in a minute</p>"}
function printReceipt(inv){var fresh=(D.invoices||[]).filter(function(i){return i&&String(i.id)===String(inv.id)})[0];if(fresh)inv=fresh;var o=D.orgInfo||{},c=cfg(),p=inv.pos||{},cn=cur();
  var rows=(inv.items||[]).map(function(l){return'<tr><td colspan="2">'+esc(l.desc)+'</td></tr><tr><td>'+l.qty+" x "+money(l.price)+(l.discount?" (-"+l.discount+"%)":"")+'</td><td class="r">'+money(l.totalWithVat)+"</td></tr>"}).join("");
  var tend=(p.tenders||[]).map(function(t){return'<tr><td>'+esc(t.m)+'</td><td class="r">'+money(t.a)+"</td></tr>"}).join("");
  var html='<html><head><title>'+esc(inv.invoiceNumber)+'</title><style>body{font:12px monospace;width:72mm;margin:0 auto;padding:4mm}table{width:100%;border-collapse:collapse}td{padding:1px 0}.r{text-align:right}h3,p{text-align:center;margin:2px 0}hr{border:0;border-top:1px dashed #000}</style></head><body><h3>'+esc(o.name||S.companyName)+'</h3><p>'+esc([o.address,o.phone,o.email].filter(Boolean).join(" · "))+'</p>'+(o.kraPin||o.pin?'<p>PIN: '+esc(o.kraPin||o.pin)+'</p>':"")+'<hr><p>'+esc(inv.invoiceNumber)+'</p><p>'+new Date(p.at||Date.now()).toLocaleString()+'</p><p>Cashier: '+esc(p.cashier||"")+' · '+esc(p.till||"")+'</p><p>Customer: '+esc(inv.customer)+'</p><hr><table>'+rows+'</table><hr><table><tr><td>Discount</td><td class="r">'+money(inv.discount)+'</td></tr><tr><td>VAT</td><td class="r">'+money(inv.vat)+'</td></tr><tr><td><b>TOTAL '+cn+'</b></td><td class="r"><b>'+money(inv.totalKES)+'</b></td></tr></table><hr><table>'+tend+'<tr><td>Change</td><td class="r">'+money(p.change)+'</td></tr></table>'+fiscalBlock(inv)+'<hr><p>'+esc(c.foot)+'</p></body></html>';
  var f=document.createElement("iframe");f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";document.body.appendChild(f);f.contentDocument.open();f.contentDocument.write(html);f.contentDocument.close();
  setTimeout(function(){f.contentWindow.focus();f.contentWindow.print();setTimeout(function(){f.remove()},2000)},250)}

/* ---------- dashboard (left sidebar > Dashboard) ---------- */
var dq="",dfilter="all";
var BKURL=(window.ACACIA_BOOKS_URL||"https://acacia-books.vercel.app/").replace(/\/?$/,"/");
/* Other Acacia apps shown on the Dashboard. Override with window.ACACIA_APPS=[{n:"Name",i:"emoji",u:"https://..."}] in config.js */
function appList(){return Array.isArray(window.ACACIA_APPS)&&window.ACACIA_APPS.length?window.ACACIA_APPS:[
  {n:"Acacia Books",i:"📚",u:BKURL,s:"Accounts & reports"},
  {n:"Inventory",i:"📦",u:"https://inventory-navy-zeta.vercel.app/",s:"Stock balancing"},
  {n:"Sales",i:"💼",u:"https://sales-xi-cyan.vercel.app/#revenue",s:"Sales & distribution"},
  {n:"Expenses",i:"💳",u:"https://expenses-jade-xi.vercel.app/",s:"Expense & ledger"},
  {n:"CRM",i:"🤝",u:"https://acacia-crm.vercel.app/?from=books#dashboard",s:"Customers & engagement"},
  {n:"Mail",i:"✉️",u:"https://acacia-mail.vercel.app/",s:"Secure mail"},
  {n:"Payroll",i:"👥",u:"https://payroll-gamma.vercel.app/",s:"Payroll & compensation"},
  {n:"Projects",i:"🗂️",u:"https://project-hub-gamma-woad.vercel.app/",s:"Project hub"},
  {n:"Plans",i:"📋",u:"https://plans-psi-ten.vercel.app/",s:"Plans"}]}
function setView(v){v=v==="sell"?"sell":"dash";$("app").classList.toggle("v-dash",v==="dash");$("bDash").classList.toggle("on",v==="dash");$("bSell").classList.toggle("on",v==="sell");lss("pos_view",v);if(v==="dash")renderDash()}
function dashStock(){var pen=pending(),m={},keys=[];
  Object.keys(D.inv||{}).forEach(function(w){D.inv[w].forEach(function(it){if(!it||it.active===false||!it.name)return;var k=low(it.sku)||low(it.name);if(!(k in m)){m[k]=0;keys.push(k)}m[k]+=(Number(it.qty)||0)});});
  var out=0,lw=0;keys.forEach(function(k){var h=m[k]-(pen[k]||0);if(h<=0)out++;else if(h<=5)lw++});
  return{n:keys.length,out:out,low:lw}}
function dashKpi(){var t=today(),sl=(D.invoices||[]).filter(function(i){return i&&i.source==="POS"&&i.date===t}),
    tot=sl.reduce(function(a,i){return a+(Number(i.totalKES)||0)},0),sh=myShift(),held=lsg("pos_held",[]).length,q=lsg("pos_queue",[]).length,st=dashStock(),c=cfg();
  $("dTitle").textContent=(D.orgInfo&&D.orgInfo.name)||S.companyName;
  $("dSub").textContent="Till "+c.till+" · "+S.name+" · "+(q?q+" waiting to upload":(navigator.onLine?"Online":"Offline"));
  var drawer=sh?r2((Number(sh.openingFloat)||0)+cashIn(shiftSales(sh))):0;
  $("dKpi").innerHTML=
    '<div class="dk"><div class="l">Sales today</div><div class="v">'+cur()+' '+money(tot)+'</div><div class="s">'+sl.length+(sl.length===1?' sale':' sales')+'</div></div>'
   +'<div class="dk"><div class="l">Shift</div><div class="v">'+(sh?'Open':'Closed')+'</div><div class="s">'+(sh?'Cash expected in drawer: '+money(drawer):'<span class="warn">Open a shift to start selling</span>')+'</div></div>'
   +'<div class="dk"><div class="l">Products</div><div class="v">'+st.n+'</div><div class="s">'+st.out+' out of stock · '+st.low+' low</div></div>'
   +'<div class="dk"><div class="l">Held sales</div><div class="v">'+held+'</div><div class="s">'+(cart.length?cart.length+' line(s) in the current sale':'Current sale is empty')+'</div></div>'}
function dashProds(){var t0=term;term=dq;var all=catalogue();term=t0;
  if(dfilter==="low")all=all.filter(function(x){return x.have>0&&x.have<=5});else if(dfilter==="out")all=all.filter(function(x){return x.have<=0});
  var list=all.slice(0,60);
  $("dCount").textContent=all.length>list.length?"Showing "+list.length+" of "+all.length+" products":all.length+(all.length===1?" product":" products");
  $("dProds").innerHTML=list.length?list.map(function(x,i){var it=x.it,im=itemImg(it),
      tag=x.have<=0?'<span class="st out">Out of stock</span>':x.have<=5?'<span class="st low">Only '+x.have+' left</span>':'<span class="st ok">'+x.have+' in stock</span>';
    return'<button type="button" class="dp" data-i="'+i+'"><div class="im">'+(im?'<img loading="lazy" alt="" src="'+esc(im)+'">':'<span class="ini">'+esc(initials(it.name))+'</span>')+'</div><div class="bd"><span class="n">'+esc(it.name)+'</span><span class="pr">'+pfmt(x.price)+'</span>'+tag+'</div></button>'}).join(""):'<div class="empty">No products found.</div>';
  dashProds.list=list;
  document.querySelectorAll("#dChips button").forEach(function(b){b.classList.toggle("on",b.dataset.f===dfilter)})}
function renderDash(){var d=$("dash");if(!S||!d||!$("dKpi")||!$("app").classList.contains("v-dash"))return;
  try{dashKpi();dashProds()}catch(e){}}
(function(){var d=$("dash");if(!d)return;
  d.innerHTML='<div class="dh"><div><h2 id="dTitle">Dashboard</h2><div class="dsub" id="dSub"></div></div><button type="button" class="btn gold" data-go="sell">🛒 Start selling</button></div>'
   +'<div class="dkpi" id="dKpi"></div>'
   +'<h3 class="dsec">Modules</h3><div class="dtiles">'
   +'<button type="button" class="tile main" data-go="sell"><span class="ic">🛒</span><b>Point of sale</b><small>Sell and take payment</small></button>'
   +'</div>'
   +'<div class="dprodhead"><h3 class="dsec">Products</h3><div class="dchips" id="dChips"><button type="button" data-f="all" class="on">All</button><button type="button" data-f="low">Low stock</button><button type="button" data-f="out">Out of stock</button></div><input id="dQ" type="search" placeholder="Search products" autocomplete="off" aria-label="Search products"></div>'
   +'<div class="count" id="dCount"></div><div class="dgrid" id="dProds"></div>';
  var go={sell:function(){setView("sell")},shift:function(){$("bShift").click()},held:function(){$("bHeld").click()},sales:function(){$("bToday").click()},pref:function(){$("bPref").click()},set:function(){$("bSet").click()}};
  d.addEventListener("click",function(e){
    var g=e.target.closest("[data-go]");if(g){var f=go[g.dataset.go];if(f)f();return}
    var c=e.target.closest("#dChips button");if(c){dfilter=c.dataset.f;dashProds();return}
    var p=e.target.closest(".dp");if(p){var x=(dashProds.list||[])[+p.dataset.i];if(x){var n0=cart.length,q0=cart.reduce(function(s,l){return s+l.qty},0);addToCart(x);if(cart.reduce(function(s,l){return s+l.qty},0)>q0)toast("Added "+x.it.name+" to the sale");dashKpi()}}});
  $("dQ").addEventListener("input",function(){dq=this.value;dashProds()});
  $("bDash").onclick=function(){setView("dash")};$("bSell").onclick=function(){setView("sell")};
  setView(lsg("pos_view","dash"));
})();

/* ---------- settings ---------- */
$("bPref").onclick=function(){open_("mPref");if(window.AcaciaAppearance)window.AcaciaAppearance.mount()};
$("bSet").onclick=function(){var c=cfg(),w=whList();$("sTill").value=c.till;$("sWh").innerHTML='<option value="">All</option>'+w.map(function(x){return"<option>"+esc(x)+"</option>"}).join("");$("sWh").value=c.wh;$("sWalk").value=c.walk;$("sDays").value=c.days;$("sNeg").value=c.neg?"1":"0";$("sFoot").value=c.foot;
  var b=bankNames();$("sMap").innerHTML=b.length?METHODS.map(function(m){return'<div class="row"><label>'+m+'</label><select data-m="'+m+'"><option value="">— pick fund —</option>'+b.map(function(x){return'<option'+(c.map[m]===x.n?" selected":"")+">"+esc(x.n)+"</option>"}).join("")+"</select></div>"}).join(""):'<p class="warn">No funds found. Add a fund in Acacia Books first.</p>';open_("mSet")};
$("sSave").onclick=async function(){var map={};document.querySelectorAll("#sMap select").forEach(function(s){if(s.value)map[s.dataset.m]=s.value});
  lss("pos_local",{till:$("sTill").value.trim()||"T1",wh:$("sWh").value});var n={walk:$("sWalk").value.trim()||"Walk-in Customer",days:parseInt($("sDays").value,10)||0,neg:$("sNeg").value==="1",foot:$("sFoot").value,map:map};
  try{await mutate("posSettings",function(){return n},{});D.posSettings=n}catch(e){toast(e.message);return}close_();fillStatic();render();toast("Settings saved")};
$("bOut").onclick=function(){if(cart.length&&!confirm("Sign out and lose the current sale?"))return;localStorage.removeItem("pos_session");location.reload()};
$("lb").onclick=login;$("lp").addEventListener("keydown",function(e){if(e.key==="Enter")login()});
var ss=lsg("pos_session",null);if(ss&&ss.companyId){S=ss;start()}

/* right tools rail: same buttons as Acacia Books. Pages open in Books (set window.ACACIA_BOOKS_URL in config.js to change) */
(function(){var rr=document.getElementById("rrail");if(!rr)return;var BK=(window.ACACIA_BOOKS_URL||"https://acacia-books.vercel.app/").replace(/\/?$/,"/");
try{if(localStorage.getItem("pos_rail_min")==="1"){rr.classList.add("min");document.getElementById("rrTog").setAttribute("aria-expanded","false")}}catch(e){}
document.getElementById("rrTog").onclick=function(){var m=rr.classList.toggle("min");this.setAttribute("aria-expanded",m?"false":"true");try{localStorage.setItem("pos_rail_min",m?"1":"0")}catch(e){}};
rr.querySelectorAll("[data-bk]").forEach(function(b){b.onclick=function(){var w=window.open(BK+b.getAttribute("data-bk"),"_blank");if(!w)alert("Popup blocked! Please allow pop-ups for this site.")}})})();
})();


/* highlight the sidebar button of the module that is open */
(function(){var m={mShift:"bShift",mHeld:"bHeld",mToday:"bToday",mRep:"bRep",mPref:"bPref",mSet:"bSet"};
function sync(){var open=null;Object.keys(m).forEach(function(k){var e=$(k);if(e&&e.classList.contains("on"))open=m[k]});
  Object.keys(m).forEach(function(k){var b=$(m[k]);if(b)b.classList.toggle("on",m[k]===open)});
  var v=document.getElementById("app").classList.contains("v-dash");$("bDash").classList.toggle("on",!open&&v);$("bSell").classList.toggle("on",!open&&!v)}
Object.keys(m).forEach(function(k){var e=$(k);if(e)new MutationObserver(sync).observe(e,{attributes:true,attributeFilter:["class"]})});
})();

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
  var keys="warehouses,customers,banks,orgInfo,priceList,appBaseCurrency,appDecimalPlaces,posSettings,posShifts,invoices,posPayments,appAddons,inventory,posItemImages";
  var r1=await rest("company_state?company_id=eq."+encodeURIComponent(S.companyId)+"&select=key,value&key=in.("+keys+")"),a=await r1.json();
  var r2=await rest("company_state?company_id=eq."+encodeURIComponent(S.companyId)+"&select=key,value&key=like."+encodeURIComponent("inventory_*")),b=await r2.json();
  var n={inv:{}};a.concat(b).forEach(function(x){var v=parse(x.value);if(x.key.indexOf("inventory_")===0)n.inv[x.key.slice(10)]=Array.isArray(v)?v:[];else n[x.key]=v});
  ["warehouses","customers","banks","priceList","invoices","posPayments","posShifts"].forEach(function(k){if(!Array.isArray(n[k]))n[k]=[]});
  if(!n.orgInfo||typeof n.orgInfo!=="object")n.orgInfo={};if(!n.posItemImages||typeof n.posItemImages!=="object"||Array.isArray(n.posItemImages))n.posItemImages={};if(!n.posSettings||typeof n.posSettings!=="object")n.posSettings={};
  if(Array.isArray(n.inventory)&&n.inventory.length&&!Object.keys(n.inv).length)n.inv.Main=n.inventory;
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
  (D.invoices||[]).forEach(function(i){if(i&&i.source==="POS"&&!i.acx)(i.items||[]).forEach(add)});lsg("pos_queue",[]).forEach(function(q){(q.invoice.items||[]).forEach(add)});return m}
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
  $("tSub").textContent=money(c.sub);$("tDis").textContent=money(c.dis);$("tVat").textContent=money(c.vat);$("tTot").textContent=cur()+" "+money(c.total);$("bPay").disabled=!cart.length}
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
  if(b.dataset.r){if(cart.length&&!confirm("Replace the current sale?"))return;cart=x.cart;$("cu").value=x.customer;close_()}lss("pos_held",h.filter(function(z){return z!==x}));renderCart();if(!b.dataset.r)$("bHeld").onclick()};

/* ---------- modals ---------- */
function open_(id){$(id).classList.add("on")}function close_(){document.querySelectorAll(".modal.on").forEach(function(m){m.classList.remove("on")})}
document.addEventListener("click",function(e){if(e.target.hasAttribute&&e.target.hasAttribute("data-x"))close_()});

/* ---------- payment ---------- */
function bankNames(){return(D.banks||[]).map(function(b,i){return{i:i,n:(b&&(b.name||b.bankName||b.accountName))||("Fund "+(i+1))}})}
function total(){return r2(calc().total)}
$("bPay").onclick=function(){if(!cart.length)return;if(!shiftOpen()){toast("Open a shift first (Shift button)");return}tenders=[{m:"Cash",a:total(),ref:""}];drawPay();open_("mPay")};
function drawPay(){var t=total();$("pDue").textContent=cur()+" "+money(t);
  $("pRows").innerHTML=tenders.map(function(x,i){return'<div class="tender"><select data-i="'+i+'" data-k="m">'+METHODS.concat(["On account"]).map(function(m){return'<option'+(m===x.m?" selected":"")+">"+m+"</option>"}).join("")+'</select><input type="number" step="any" min="0" data-i="'+i+'" data-k="a" value="'+x.a+'">'+(x.m==="Cash"||x.m==="On account"?"":'<input data-i="'+i+'" data-k="ref" placeholder="Reference" value="'+esc(x.ref)+'">')+'<button class="q" data-rm="'+i+'">✕</button></div>'}).join("");sumPay()}
function sumPay(){var t=total(),paid=0,cashIn=0,acct=0;tenders.forEach(function(x){var a=Number(x.a)||0;if(x.m==="On account")acct+=a;else{paid+=a;if(x.m==="Cash")cashIn+=a}});
  var change=Math.max(r2(paid-(t-acct)),0),msg="";if(change>cashIn)msg="Only cash can give change.";
  var short=r2(t-paid-acct);if(short>0)msg="Short by "+money(short);if(acct>0&&low($("cu").value)===low(cfg().walk))msg="Pick a named customer for sales on account.";
  $("pPaid").textContent=money(paid+acct);$("pChg").textContent=money(change);$("pMsg").textContent=msg;$("pOk").disabled=!!msg;pay.change=change;pay.msg=msg}
var pay={};
$("pRows").addEventListener("input",function(e){var t=e.target,x=tenders[+t.dataset.i];if(!x)return;x[t.dataset.k]=t.dataset.k==="a"?parseFloat(t.value)||0:t.value;sumPay()});
$("pRows").addEventListener("change",function(e){var t=e.target;if(t.dataset.k==="m"){tenders[+t.dataset.i].m=t.value;drawPay()}});
$("pRows").addEventListener("click",function(e){var b=e.target.closest("[data-rm]");if(b){tenders.splice(+b.dataset.rm,1);if(!tenders.length)tenders=[{m:"Cash",a:0,ref:""}];drawPay()}});
$("pAdd").onclick=function(){var paid=tenders.reduce(function(s,x){return s+(Number(x.a)||0)},0);tenders.push({m:"M-Pesa",a:Math.max(r2(total()-paid),0),ref:""});drawPay()};
$("pExact").onclick=function(){tenders=[{m:"Cash",a:total(),ref:""}];drawPay()};

/* ---------- sale ---------- */
function nextNumber(till){var pre="POS"+till.replace(/[^A-Za-z0-9]/g,"")+"-",mx=0;
  (D.invoices||[]).concat(lsg("pos_queue",[]).map(function(q){return q.invoice})).forEach(function(i){var n=String(i&&i.invoiceNumber||"");if(n.indexOf(pre)===0){var v=parseInt(n.slice(pre.length),10);if(v>mx)mx=v}});
  var l=lsg("pos_counter_"+S.companyId+pre,0);return pre+String(Math.max(mx,l)+1).padStart(5,"0")}
$("pOk").onclick=async function(){
  if(pay.msg)return;var btn=this;btn.disabled=true;var c=cfg(),cs=calc(),t=total(),now=new Date(),date=today(),acctSum=0,paid=0,cashIn=0;
  tenders.forEach(function(x){var a=Number(x.a)||0;if(x.m==="On account")acctSum+=a;else{paid+=a;if(x.m==="Cash")cashIn+=a}});
  var change=pay.change||0,applied=r2(paid-change),no=nextNumber(c.till),acct="";
  for(var i=0;i<cs.lines.length;i++){if(cs.lines[i]._acct){acct=cs.lines[i]._acct;break}}
  var dpl=dp(),id=Number(String(Date.now())+String(Math.floor(Math.random()*90)+10));
  var inv={id:id,invoiceNumber:no,date:date,customer:$("cu").value,netDays:acctSum>0?c.days:0,dueDate:date,account:acct,salesPerson:S.name,lpo:"",
    items:cs.lines.map(function(l){var o=Object.assign({},l);delete o._acct;return o}),total:cs.total.toFixed(dpl),discount:cs.dis.toFixed(dpl),vat:cs.vat.toFixed(dpl),
    salesGeneral:cs.gen.toFixed(dpl),salesOther:cs.oth.toFixed(dpl),salesZero:cs.zero.toFixed(dpl),salesExempt:cs.ex.toFixed(dpl),currency:cur(),exchangeRate:1,totalKES:r2(cs.total),paid:false,status:"Unpaid",source:"POS",
    pos:{till:c.till,cashier:S.name,at:now.toISOString(),tenders:tenders.map(function(x){return{m:x.m,a:Number(x.a)||0,ref:x.ref||""}}),change:change}};
  if(acctSum>0&&paid>0){}
  var pays=[],left=applied;
  tenders.forEach(function(x,i){if(x.m==="On account")return;var a=Number(x.a)||0;if(x.m==="Cash")a=Math.max(r2(a-change),0);if(a<=0)return;a=Math.min(a,left);left=r2(left-a);
    var bank=(c.map[x.m]||c.map.Cash||"");pays.push({id:id+"-"+i,invoiceId:id,invoiceNumber:no,date:date,amount:a,method:x.m,bank:bank,reference:no+(x.ref?" "+x.ref:""),status:"pending",app:"POS"})});
  var rec={invoice:inv,pays:pays,customer:inv.customer,walk:inv.customer===c.walk};
  var q=lsg("pos_queue",[]);q.push(rec);lss("pos_queue",q);lss("pos_counter_"+S.companyId+"POS"+c.till.replace(/[^A-Za-z0-9]/g,"")+"-",parseInt(no.split("-").pop(),10));
  lastSale={inv:inv,paid:paid,change:change,tendered:paid};
  cart=[];renderCart();close_();$("dTot").textContent=cur()+" "+money(cs.total);$("dChg").textContent=money(change);open_("mDone");$("dNote").textContent="Saving to Acacia Books…";btn.disabled=false;
  var ok=await flushQueue();$("dNote").textContent=ok?"Saved to Acacia Books. Stock and ledger update when Books next opens.":"No connection. The sale is saved on this device and will upload automatically.";
};
$("dNew").onclick=function(){close_();$("q").focus()};
$("dPrint").onclick=function(){if(lastSale)printReceipt(lastSale.inv)};
var flushing=false;
async function flushQueue(){if(flushing||!S)return true;var q=lsg("pos_queue",[]);if(!q.length){hdr();return true}flushing=true;var ok=true;
  try{for(var i=0;i<q.length;i++){var r=q[i];
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
function hdr(){var s=myShift(),q=lsg("pos_queue",[]).length;$("hShift").textContent=s?("Shift open · "+cfg().till):"No shift open";$("hNet").textContent=q?q+" waiting to upload":(navigator.onLine?"Online":"Offline")}
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

/* ---------- receipt ---------- */
function printReceipt(inv){var o=D.orgInfo||{},c=cfg(),p=inv.pos||{},cn=cur();
  var rows=(inv.items||[]).map(function(l){return'<tr><td colspan="2">'+esc(l.desc)+'</td></tr><tr><td>'+l.qty+" x "+money(l.price)+(l.discount?" (-"+l.discount+"%)":"")+'</td><td class="r">'+money(l.totalWithVat)+"</td></tr>"}).join("");
  var tend=(p.tenders||[]).map(function(t){return'<tr><td>'+esc(t.m)+'</td><td class="r">'+money(t.a)+"</td></tr>"}).join("");
  var html='<html><head><title>'+esc(inv.invoiceNumber)+'</title><style>body{font:12px monospace;width:72mm;margin:0 auto;padding:4mm}table{width:100%;border-collapse:collapse}td{padding:1px 0}.r{text-align:right}h3,p{text-align:center;margin:2px 0}hr{border:0;border-top:1px dashed #000}</style></head><body><h3>'+esc(o.name||S.companyName)+'</h3><p>'+esc([o.address,o.phone,o.email].filter(Boolean).join(" · "))+'</p>'+(o.kraPin||o.pin?'<p>PIN: '+esc(o.kraPin||o.pin)+'</p>':"")+'<hr><p>'+esc(inv.invoiceNumber)+'</p><p>'+new Date(p.at||Date.now()).toLocaleString()+'</p><p>Cashier: '+esc(p.cashier||"")+' · '+esc(p.till||"")+'</p><p>Customer: '+esc(inv.customer)+'</p><hr><table>'+rows+'</table><hr><table><tr><td>Discount</td><td class="r">'+money(inv.discount)+'</td></tr><tr><td>VAT</td><td class="r">'+money(inv.vat)+'</td></tr><tr><td><b>TOTAL '+cn+'</b></td><td class="r"><b>'+money(inv.totalKES)+'</b></td></tr></table><hr><table>'+tend+'<tr><td>Change</td><td class="r">'+money(p.change)+'</td></tr></table><hr><p>'+esc(c.foot)+'</p></body></html>';
  var f=document.createElement("iframe");f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0";document.body.appendChild(f);f.contentDocument.open();f.contentDocument.write(html);f.contentDocument.close();
  setTimeout(function(){f.contentWindow.focus();f.contentWindow.print();setTimeout(function(){f.remove()},2000)},250)}

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
})();


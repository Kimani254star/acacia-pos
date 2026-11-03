/* Acacia POS theme: Automatic (follows device), Light or Dark. Saved in localStorage "pos_theme". */
(function(){
  var KEY="pos_theme",root=document.documentElement;
  function get(){try{return localStorage.getItem(KEY)||"auto"}catch(e){return"auto"}}
  function apply(v){
    if(v==="light"||v==="dark")root.setAttribute("data-theme",v);else root.removeAttribute("data-theme");
    var m=document.querySelector('meta[name="theme-color"]');
    if(m){var dark=v==="dark"||(v!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);m.setAttribute("content",dark?"#0b1633":"#1e3a8a")}
  }
  function set(v){try{localStorage.setItem(KEY,v)}catch(e){}apply(v)}
  apply(get());
  window.PosTheme={get:get,set:set};
  document.addEventListener("DOMContentLoaded",function(){
    apply(get());var s=document.getElementById("themeSel");if(!s)return;
    s.value=get();s.addEventListener("change",function(){set(s.value)});
    var bp=document.getElementById("bPref");if(bp)bp.addEventListener("click",function(){s.value=get()});
  });
  if(window.matchMedia)try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){apply(get())})}catch(e){}
})();

/* hooks the Books home page expects from its host page */
window.__SUPA_URL__="https://xglsampckermarjpczdf.supabase.co";window.__SUPA_KEY__="sb_publishable_x-dPR7pzhvJgag9soW0I8w_yfKTmi6A";
window.openLogin=function(){document.body.classList.remove("lp-on");try{history.replaceState(null,"","#signin")}catch(e){}var e=document.getElementById("lc");if(e)e.focus()};
window.acaciaHideLanding=window.openLogin;
window.showRegisterForm=function(){window.open("https://acacia-books.vercel.app/","_blank","noopener")};
window.choosePlan=function(){window.showRegisterForm()};
document.addEventListener("click",function(e){if(e.target.closest("#lpBack")){e.preventDefault();document.body.classList.add("lp-on");try{history.replaceState(null,"",location.pathname+location.search)}catch(x){}}});

window.addEventListener("message",function(e){if(e.origin!=="https://acacia-books.vercel.app"&&e.origin!==location.origin)return;var m=e.data&&e.data.acx;if(m==="login")window.openLogin();if(m==="register")window.showRegisterForm()});

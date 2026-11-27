// Mobil uygulamada Google girişinden dönüş: kodu uygulamaya iletir (com.aisaasavran.app://giris). CSP sayfa içi kodu engellediği için ayrı dosya.
// Metinler telefonun diline göre: Türkçe değilse İngilizce.
(function(){
var tr=/^tr\b/i.test((navigator.languages&&navigator.languages[0])||navigator.language||"");
var T=tr?{t:"Uygulamaya dönülüyor",m:"Uygulama açılmazsa düğmeye dokunun.",b:"SaaSavran'ı aç",x:"Bu sayfa yalnız SaaSavran uygulamasında Google ile giriş yapılırken kullanılır. Siteye gitmek için aisaasavran.com adresini açın.",y:"aisaasavran.com'a git"}
:{t:"Returning to the app",m:"If the app doesn't open, tap the button.",b:"Open SaaSavran",x:"This page is only used while signing in with Google in the SaaSavran app. To visit the website, open aisaasavran.com.",y:"Go to aisaasavran.com"};
document.documentElement.lang=tr?"tr":"en";
var q=location.search||"",h=location.hash||"";var u="com.aisaasavran.app://giris"+q+(h&&h.length>1?h:"");
var t=document.getElementById("t"),m=document.getElementById("m"),b=document.getElementById("b");
if(t)t.textContent=T.t;m.textContent=T.m;b.textContent=T.b;b.href=u;
if(!/[?&#](code|error)=/.test(q+h)){m.textContent=T.x;b.href="https://aisaasavran.com/";b.textContent=T.y;return;}
location.replace(u);})();

// The account icon in every page header. OctoBot's tools never need an account; this only adds a way to sign in to one
// (friends and profile pictures in EqUpdater). It stays hidden until the account service address below is set, so nothing
// changes for visitors until accounts are opened. To preview before then: localStorage.octobotAccounts = "https://..." (https only).
(function () {
  var ACCOUNTS = "";                                   // e.g. "https://accounts.example/account", set when the service is public
  var override = "";
  try { override = localStorage.getItem("octobotAccounts") || ""; } catch (e) {}
  var url = ACCOUNTS || (/^https:\/\/[a-z0-9.-]+(\/[A-Za-z0-9._~\/-]*)?$/i.test(override) ? override : "");
  if (!url) return;
  var base = (document.currentScript && document.currentScript.src || "").replace(/account-icon\.js.*$/, "");
  function add() {
    document.querySelectorAll(".site-header .header-status").forEach(function (bar) {
      if (bar.querySelector(".account-link")) return;
      var a = document.createElement("a");
      a.className = "header-link account-link";
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", "Your OctoBot account"); a.setAttribute("data-tip", "Account");
      var i = document.createElement("span");
      i.className = "header-icon"; i.setAttribute("aria-hidden", "true");
      var m = "url(" + base + "img/account.png?v=1) center/contain no-repeat";
      i.style.webkitMask = m; i.style.mask = m;
      a.appendChild(i);
      bar.appendChild(a);                                // the right-most icon: top-right of the page
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
})();

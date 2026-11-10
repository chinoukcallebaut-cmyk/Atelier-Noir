/* Atelier Noir — landingspagina
   Vanilla JS, geen framework.
   1. kopbalk bij scrollen
   2. campagnefilm (autoplay enkel zonder 'reduced motion', pauzeknop)
   3. geuren als lagen over de volle breedte (sticky + de laag eronder zakt weg)
   4. inschrijfformulier naar MailerLite (validatie in het Nederlands)
*/
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. kopbalk ---------- */
  var kop = document.querySelector('.kop');
  if (kop) {
    var zetKop = function () { kop.classList.toggle('is-gescrold', window.scrollY > 8); };
    zetKop();
    window.addEventListener('scroll', zetKop, { passive: true });
  }

  /* ---------- 2. campagnefilm ---------- */
  var video = document.getElementById('hero-video');
  var videoKnop = document.getElementById('video-knop');
  if (video && videoKnop) {
    var knopTekst = videoKnop.querySelector('.videoknop__tekst');
    var zetKnop = function () {
      var gepauzeerd = video.paused;
      videoKnop.setAttribute('aria-pressed', String(gepauzeerd));
      knopTekst.textContent = gepauzeerd ? 'Speel film' : 'Pauzeer film';
    };
    videoKnop.hidden = false;
    video.addEventListener('play', zetKnop);
    video.addEventListener('pause', zetKnop);
    videoKnop.addEventListener('click', function () {
      if (video.paused) { video.play(); } else { video.pause(); }
    });

    if (!reducedMotion) {
      var start = video.play();
      if (start && typeof start.catch === 'function') { start.catch(zetKnop); }
    }
    zetKnop();

    // film pauzeren buiten beeld, spaart batterij
    if ('IntersectionObserver' in window) {
      var doorGebruiker = false;
      videoKnop.addEventListener('click', function () { doorGebruiker = video.paused; });
      new IntersectionObserver(function (items) {
        items.forEach(function (item) {
          if (!item.isIntersecting && !video.paused) { video.pause(); }
          else if (item.isIntersecting && video.paused && !doorGebruiker && !reducedMotion) { video.play().catch(function () {}); }
        });
      }, { threshold: 0.25 }).observe(video);
    }
  }

  /* ---------- 3. geuren als gestapelde lagen ---------- */
  var stapel = document.querySelector('.stapel');
  if (stapel) {
    var lagen = Array.prototype.slice.call(stapel.querySelectorAll('.geur'));
    var bezig = false;

    // Elke laag blijft staan zodra ze volledig te zien is. Is een laag hoger dan het scherm
    // (gsm), dan scrolt ze eerst helemaal door en blijft ze pas staan met haar onderkant
    // tegen de onderrand: een negatieve 'top' voor position: sticky. Zo valt er nooit tekst weg.
    function controleerHoogte() {
      var kop = document.querySelector('.kop');
      var kopHoogte = kop ? kop.offsetHeight : 0;
      lagen.forEach(function (laag) {
        laag.style.top = Math.min(kopHoogte, window.innerHeight - laag.offsetHeight) + 'px';
      });
    }

    // hoe ver de volgende laag over deze laag geschoven is: 0 tot 1
    function zetDekking() {
      bezig = false;
      if (reducedMotion || stapel.classList.contains('stapel--plat')) { return; }
      lagen.forEach(function (laag, i) {
        var volgende = lagen[i + 1];
        var p = 0;
        if (volgende) {
          var a = laag.getBoundingClientRect();
          var b = volgende.getBoundingClientRect();
          p = Math.min(Math.max((a.bottom - b.top) / a.height, 0), 1);
        }
        laag.style.setProperty('--gedekt', p.toFixed(3));
      });
    }

    function opScroll() { if (!bezig) { bezig = true; window.requestAnimationFrame(zetDekking); } }

    controleerHoogte();
    zetDekking();
    window.addEventListener('scroll', opScroll, { passive: true });
    window.addEventListener('resize', function () { controleerHoogte(); zetDekking(); });
    window.addEventListener('load', function () { controleerHoogte(); zetDekking(); });
  }

  /* ---------- 4. inschrijfformulier ---------- */
  var form = document.getElementById('ml-form');
  if (form) {
    var bedankt = document.getElementById('form-bedankt');
    var status = form.querySelector('.form__status');
    var knop = form.querySelector('button[type="submit"]');
    var naam = document.getElementById('veld-naam');
    var email = document.getElementById('veld-email');
    var interesses = Array.prototype.slice.call(form.querySelectorAll('input[name="fields[atelier_noir][]"]'));
    var emailPatroon = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // 'Waar ben je benieuwd naar?' is verplicht: minstens één vakje (geen enkel vooraf aangevinkt)
    var checks = [
      { veld: naam, fout: 'fout-naam', ok: function () { return naam.value.trim().length > 0; } },
      { veld: email, fout: 'fout-email', ok: function () { return emailPatroon.test(email.value.trim()); } },
      { veld: interesses[0], groep: interesses, fout: 'fout-interesse', ok: function () { return interesses.some(function (i) { return i.checked; }); } }
    ];

    function toon(check, geldig) {
      var el = document.getElementById(check.fout);
      el.textContent = geldig ? '' : el.getAttribute('data-fout');
      (check.groep || [check.veld]).forEach(function (v) { v.setAttribute('aria-invalid', String(!geldig)); });
    }

    // fout wegnemen zodra het veld klopt; pas na verlaten opnieuw controleren
    checks.forEach(function (check) {
      (check.groep || [check.veld]).forEach(function (v) {
        v.addEventListener(v.type === 'checkbox' ? 'change' : 'input', function () {
          if (v.getAttribute('aria-invalid') === 'true' && check.ok()) { toon(check, true); }
        });
      });
      if (check.veld.type !== 'checkbox') {
        check.veld.addEventListener('blur', function () {
          if (check.veld.value.trim() !== '') { toon(check, check.ok()); }
        });
      }
    });

    function klaar() {
      form.hidden = true;
      bedankt.hidden = false;
      bedankt.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.textContent = '';

      var eersteFout = null;
      checks.forEach(function (check) {
        var geldig = check.ok();
        toon(check, geldig);
        if (!geldig && !eersteFout) { eersteFout = check.veld; }
      });
      if (eersteFout) { eersteFout.focus(); return; }

      knop.disabled = true;
      knop.textContent = 'Even geduld';
      var data = new FormData(form);

      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json && json.success) { klaar(); }
          else { throw new Error('mailerlite'); }
        })
        .catch(function (fout) {
          // Geen CORS-antwoord: verstuur blind (MailerLite verwerkt de inschrijving wel)
          if (fout instanceof TypeError) {
            return fetch(form.action, { method: 'POST', body: data, mode: 'no-cors' }).then(klaar);
          }
          throw fout;
        })
        .catch(function () {
          status.textContent = 'Dat lukte niet. Kijk je gegevens na of probeer het zo opnieuw.';
          knop.disabled = false;
          knop.textContent = 'Schrijf je in';
        });
    });
  }

  /* ---------- jaartal in de voet ---------- */
  document.querySelectorAll('[data-jaar]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

/* =========================================================
   Реквізити продавця — ОДНЕ місце для всіх юридичних сторінок
   (оферта, повернення, конфіденційність) і підвалу сайту.

   Заповніть значення у квадратних дужках. Поки у значенні є «[»,
   на сторінках воно підсвічується жовтим, щоб його не пропустити.
   ========================================================= */
window.SELLER = {
  // повне ПІБ, як у виписці з ЄДР
  name: 'ФОП Куманов Ігор Дмитрович',
  shortName: 'ФОП Куманов І. Д.',
  // РНОКПП (ідентифікаційний код)
  ipn: '3455608652',
  iban: 'UA903220010000026005360007497',
  bank: 'АТ «УНІВЕРСАЛ БАНК», МФО 322001',
  // місце реєстрації ФОП з виписки з ЄДР
  address: '[адреса реєстрації ФОП]',
  phone: '+380 97 857 2847',
  email: 'kumchikproduction@gmail.com',
  telegram: '@kumchik',
  // скільки робочих днів займає виготовлення лампи після підтвердження
  productionDays: '[N]',
  // дата, з якої діють умови (оновлюйте при зміні тексту)
  effectiveDate: '25.09.2026',
};

/* Fills every <… data-seller="key"> on the page with SELLER[key]. */
(function fillSeller(){
  const run = () => document.querySelectorAll('[data-seller]').forEach(el => {
    const value = window.SELLER[el.dataset.seller] ?? '';
    el.textContent = value;
    el.classList.toggle('seller-missing', value.includes('['));
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();

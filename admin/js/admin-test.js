// MINIMAL TEST FILE
console.log('==== ADMIN.JS IS LOADING ====');
alert('admin.js loaded!');

document.addEventListener('DOMContentLoaded', () => {
    console.log('==== DOM LOADED ====');
    alert('DOM loaded!');

    document.getElementById('subjects-list').innerHTML = '\u003cp\u003eTest - JS is working!\u003c/p\u003e';
});

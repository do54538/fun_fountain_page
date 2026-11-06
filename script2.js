window.addEventListener("scroll", function() {
    let scrollY = window.scrollY;
    let image  = document.querySelector("#page #top .top-image img");
    image.style.transform = `translateY(${scrollY * 0.3}px)`;
});

let fadeInElements = document.querySelectorAll("#page .fade-in");
/* データは格納されているのに、フェードインうまくいかない？*/
console.log(fadeInElements);

let observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
            observer.unobserve(entry.target);
        }
    });
}, {
  root: scrollArea,
  rootMargin: "-75px 0px -30px 0px",   // 上:ヘッダー75px / 下:フッター30px
  threshold: 0.1,
});


fadeInElements.forEach(function(element) {
    observer.observe(element);
});
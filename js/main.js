// GSAP
gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

let smoother = null;

function isMobileViewport() {
    return window.matchMedia("(max-width: 1019px)").matches;
}

function setupSmoother() {
    const wrapper = document.querySelector("#smooth-wrapper");
    const content = document.querySelector("#smooth-content");
    const shouldDisableSmoother = isMobileViewport() || ScrollTrigger.isTouch === 1;

    if (shouldDisableSmoother) {
        if (smoother) {
            smoother.kill();
            smoother = null;
        }
        return;
    }

    if (!smoother && wrapper && content) {
        smoother = ScrollSmoother.create({
            smooth: 1.5,
            effects: true
        });
    }
}

function initNavbarScroll() {
    const nav = document.querySelector("nav");
    const menuToggle = document.getElementById("menu-toggle");
    if (!nav) return;

    const hideOffset = 72;
    const scrollDelta = 8;
    let lastScrollY = window.scrollY || window.pageYOffset || 0;
    let ticking = false;

    const updateNavbar = () => {
        const currentScrollY = window.scrollY || window.pageYOffset || 0;
        const menuOpen = Boolean(menuToggle?.checked) || document.body.classList.contains("menu-open");

        if (menuOpen || currentScrollY <= hideOffset) {
            nav.classList.remove("hide");
        } else if (currentScrollY > lastScrollY + scrollDelta) {
            nav.classList.add("hide");
        } else if (currentScrollY < lastScrollY - scrollDelta) {
            nav.classList.remove("hide");
        }

        lastScrollY = currentScrollY;
        ticking = false;
    };

    const requestUpdate = () => {
        if (ticking) return;

        ticking = true;
        window.requestAnimationFrame(updateNavbar);
    };

    updateNavbar();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", () => {
        lastScrollY = window.scrollY || window.pageYOffset || 0;
        updateNavbar();
    });
    window.addEventListener("orientationchange", () => {
        lastScrollY = window.scrollY || window.pageYOffset || 0;
        updateNavbar();
    });
}

function initNavSectionHighlight() {
    const nav = document.querySelector("nav");
    if (!nav) return;

    const menuLinks = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const sectionLinks = menuLinks
        .map((link) => {
            const targetId = link.getAttribute("href")?.slice(1);
            if (!targetId) return null;

            const target = document.getElementById(targetId);
            if (!target) return null;

            return { link, targetId, target };
        })
        .filter(Boolean);

    if (!sectionLinks.length) return;

    let ticking = false;
    let activeTargetId = null;

    const getScrollThreshold = () => {
        const navHeight = nav.getBoundingClientRect().height || 0;
        return window.scrollY + navHeight + 24;
    };

    const setActiveTarget = (targetId) => {
        if (activeTargetId === targetId) return;
        activeTargetId = targetId;

        sectionLinks.forEach(({ link, targetId: linkTargetId }) => {
            const isActive = linkTargetId === targetId;
            link.classList.toggle("is-active", isActive);
            link.parentElement?.classList.toggle("is-active", isActive);
        });
    };

    const updateActiveLink = () => {
        const threshold = getScrollThreshold();
        let currentTargetId = "top";

        for (const { targetId, target } of sectionLinks) {
            const targetTop = target.getBoundingClientRect().top + window.scrollY;
            if (threshold >= targetTop) {
                currentTargetId = targetId;
            }
        }

        setActiveTarget(currentTargetId);
        ticking = false;
    };

    const requestUpdate = () => {
        if (ticking) return;

        ticking = true;
        window.requestAnimationFrame(updateActiveLink);
    };

    updateActiveLink();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("orientationchange", requestUpdate);
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    setupSmoother();
    initNavbarScroll();
    initNavSectionHighlight();
    initMobileMenu();
    initAnchors();
    initPalavras();
    initPortfolio();

    document.fonts.ready.then(() => {
        animarPagina();
        ScrollTrigger.refresh();
    });

    window.addEventListener("load", () => {
        ScrollTrigger.refresh();
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            setupSmoother();
            ScrollTrigger.refresh();
        }, 150);
    });

    window.addEventListener("orientationchange", () => {
        setupSmoother();
        ScrollTrigger.refresh();
    });
});

// =============== ANCHORS ================
function initAnchors() {
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;

        const targetId = link.getAttribute('href');
        if (!targetId) return;

        closeMobileMenu();

        event.preventDefault();

        const scrollOptions = {
            duration: 1.2,
            ease: 'power2.out',
            offset: 0
        };

        if (targetId === '#' || targetId === '#top') {
            if (smoother?.scrollTo) {
                smoother.scrollTo(0, scrollOptions);
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }

        if (smoother?.scrollTo) {
            smoother.scrollTo(targetId, scrollOptions);
            return;
        }

        const target = document.querySelector(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

// ============== PALAVRAS =================
function initPalavras() {
    const palavras = ["ÚNICOS", "IMPORTANTES", "INESQUECÍVEIS"];
    let index = 0;

    const elemento = document.getElementById("palavra-animada");
    if (!elemento) return;

    function loop() {
        elemento.classList.add("fade-out");

        setTimeout(() => {
            index = (index + 1) % palavras.length;
            elemento.textContent = palavras[index];

            elemento.classList.remove("fade-out");
            elemento.classList.add("fade-in");
        }, 400);

        setTimeout(() => {
            elemento.classList.remove("fade-in");
            loop();
        }, 2500);
    }

    loop();
}

function initPortfolio() {
    const portfolioSection = document.querySelector("#sec5");
    const portfolioCards = Array.from(document.querySelectorAll("#sec5 .portfolio"));
    const portfolioIntro = Array.from(document.querySelectorAll("#textoPortfolio .portfolio-kicker, #textoPortfolio p"));

    if (!portfolioSection || !portfolioCards.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
        gsap.set([...portfolioIntro, ...portfolioCards], { opacity: 1, y: 0, clearProps: "transform" });
        return;
    }

    gsap.set(portfolioIntro, { y: 36, autoAlpha: 0 });
    gsap.set(portfolioCards, { y: 88, scale: 0.96, autoAlpha: 0 });

    let portfolioPlayed = false;
    const playPortfolio = () => {
        if (portfolioPlayed) return;
        portfolioPlayed = true;

        const tl = gsap.timeline();
        tl.to(portfolioIntro, {
            y: 0,
            autoAlpha: 1,
            duration: 0.8,
            stagger: 0.08,
            ease: "power2.out"
        }).to(portfolioCards, {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.9,
            stagger: 0.12,
            ease: "power3.out"
        }, "-=0.35");
    };

    const portfolioStart = window.innerWidth <= 767 ? "top 62%" : window.innerWidth <= 1019 ? "top 70%" : "top 78%";

    ScrollTrigger.create({
        trigger: portfolioSection,
        start: portfolioStart,
        onEnter: playPortfolio,
        onEnterBack: playPortfolio,
        once: true
    });

    const viewportThreshold = window.innerWidth <= 767 ? 0.35 : 0.15;
    if (ScrollTrigger.isInViewport(portfolioSection, viewportThreshold)) {
        playPortfolio();
    }

}

// ============== ANIMAÇÕES ===============
function animarPagina() {
    const textosAnim = document.querySelectorAll(".textoAnimado");
    const isMobile = window.innerWidth <= 767;
    const isTablet = window.innerWidth <= 1019;

    let startValue;
    if (isMobile) {
        startValue = "top 62%";
    } else if (isTablet) {
        startValue = "top 85%";
    } else {
        startValue = "top 100%";
    }

    const sectionStart = isMobile ? "top 38%" : isTablet ? "top 45%" : "top 50%";
    const servicesStart = isMobile ? "top 40%" : isTablet ? "top 46%" : "top 50%";

    textosAnim.forEach(textoA => {
        const split = new SplitText(textoA, {
            type: "lines, words, chars",
            linesClass: "split-line"
        });

        gsap.set(split.chars, { y: 40, opacity: 0 });

        gsap.timeline({
            scrollTrigger: {
                trigger: textoA,
                start: startValue,
                toggleActions: "play reverse play reverse",
                invalidateOnRefresh: true
            }
        }).to(split.chars, {
            y: 0,
            opacity: 1,
            duration: 0.30,
            stagger: 0.02,
            ease: "power2.out"
        });
    });

    gsap.from("#hero", { opacity: 0, duration: 1 });

    gsap.from("#imgHero", {
        x: 1000,
        duration: 1.5,
        ease: "power2.inOut"
    });

    gsap.to("#direitaHero", {
        y: 100,
        scrollTrigger: {
            trigger: "#sec2",
            start: "top bottom",
            end: "center center",
            scrub: 1
        }
    });

    gsap.from("#imgQuemSomos", {
        y: 100,
        opacity: 0,
        duration: 1,
        filter: "blur(6px)",
        scrollTrigger: {
            trigger: "#sec2",
            start: sectionStart,
            ease: "power2.inOut"
        }
    });


    gsap.from("#img1valor", {
        y: -150,
        opacity: 0,
        scrollTrigger: {
            trigger: "#sec3",
            start: sectionStart
        }
    });

    gsap.from("#img2valor", {
        y: 150,
        opacity: 0,
        delay: 0.2,
        scrollTrigger: {
            trigger: "#sec3",
            start: sectionStart
        }
    });


    gsap.set(".polaroid", {
        scale: 1.4,
        opacity: 0,
        y: -10
    });

    gsap.to(".polaroid", {
        scale: 1,
        y: 0,
        opacity: 1,
        duration: 0.3,
        stagger: 0.2,
        scrollTrigger: {
            trigger: "#servicos",
            start: servicesStart
        }
    });
}

function initMobileMenu() {
    const menuToggle = document.getElementById("menu-toggle");
    if (!menuToggle) return;

    const syncMenuState = () => {
        document.body.classList.toggle("menu-open", menuToggle.checked && window.innerWidth <= 767);
    };

    menuToggle.addEventListener("change", syncMenuState);
    window.addEventListener("resize", syncMenuState);
}

function closeMobileMenu() {
    const menuToggle = document.getElementById("menu-toggle");
    if (!menuToggle) return;

    if (menuToggle.checked) {
        menuToggle.checked = false;
    }
    document.body.classList.remove("menu-open");
}

// GSAP
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

const MOBILE_BREAKPOINT = 319;
const TABLET_BREAKPOINT = 1019;

let smoother = null;

function getScrollY() {
    return window.scrollY || window.pageYOffset || 0;
}

function isPhoneViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

function isMobileViewport() {
    return window.innerWidth <= TABLET_BREAKPOINT;
}

function isLowPerformanceDevice() {
    const cores = navigator.hardwareConcurrency || 0;
    const memory = navigator.deviceMemory || 0;
    return isMobileViewport() || (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4);
}

function getMotionProfile() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPerformance = isLowPerformanceDevice();

    return {
        reduce,
        lowPerformance,
        durationScale: lowPerformance ? 0.82 : 1,
        staggerScale: lowPerformance ? 0.75 : 1,
        distanceScale: lowPerformance ? 0.78 : 1,
        scrub: lowPerformance ? 0.75 : 1,
        anchorDuration: lowPerformance ? 0.95 : 1.2,
        depoimentosInterval: lowPerformance ? 6500 : 5000
    };
}

function initGlobalAnimationOptimization() {
    document.body.classList.toggle("low-performance-device", isLowPerformanceDevice());
    let wasHidden = document.hidden;

    const syncAnimationState = () => {
        const isHidden = document.hidden;
        document.body.classList.toggle("animations-paused", isHidden);

        if (!isHidden && wasHidden) {
            window.requestAnimationFrame(() => {
                smoother?.refresh?.();
                ScrollTrigger.update();
                ScrollTrigger.refresh();
            });
        }

        wasHidden = isHidden;
    };

    syncAnimationState();
    document.addEventListener("visibilitychange", syncAnimationState);
}

function restoreHashScrollImmediate() {
    const { hash } = window.location;
    if (!hash || hash === "#" || hash === "#top") return;

    const target = document.querySelector(hash);
    if (!target) return;

    // Usar requestAnimationFrame para adiar a restauração do scroll
    // Isso garante que o ScrollSmoother esteja totalmente inicializado
    window.requestAnimationFrame(() => {
        if (smoother?.scrollTo) {
            smoother.scrollTo(target, false, "top top");
        } else {
            target.scrollIntoView({ behavior: "auto", block: "start" });
        }

        ScrollTrigger.update();
        ScrollTrigger.refresh();
    });
}

function initNavbarScroll() {
    const nav = document.querySelector("nav");
    const menuToggle = document.getElementById("menu-toggle");
    if (!nav) return;

    const hideOffset = 72;
    const scrollDelta = 8;
    let lastScrollY = getScrollY();
    let ticking = false;

    const updateNavbar = () => {
        const currentScrollY = getScrollY();
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

    const syncNavbarWithViewport = () => {
        lastScrollY = getScrollY();
        updateNavbar();
    };

    updateNavbar();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", syncNavbarWithViewport);
    window.addEventListener("orientationchange", syncNavbarWithViewport);

    menuToggle?.addEventListener("change", () => {
        window.requestAnimationFrame(updateNavbar);
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
        return getScrollY() + navHeight + 24;
    };

    const setActiveTarget = (targetId) => {
        if (activeTargetId === targetId) return;
        activeTargetId = targetId;

        sectionLinks.forEach(({ link, targetId: linkTargetId }) => {
            const isActive = targetId !== null && linkTargetId === targetId;
            link.classList.toggle("is-active", isActive);
            link.parentElement?.classList.toggle("is-active", isActive);
        });
    };

    const updateActiveLink = () => {
        const threshold = getScrollThreshold();
        let currentTargetId = null;

        // Percorre as seções da navbar e verifica se o scroll está dentro delas
        for (let i = 0; i < sectionLinks.length; i++) {
            const { targetId, target } = sectionLinks[i];
            const targetTop = target.offsetTop;
            const nextSectionTop = sectionLinks[i + 1]?.target.offsetTop;
            const sectionBottom = targetTop + target.offsetHeight;
            const sectionEnd = nextSectionTop ?? sectionBottom;

            // Marca como ativo apenas se o scroll está dentro do intervalo da seção
            if (threshold >= targetTop && threshold < sectionEnd) {
                currentTargetId = targetId;
                break;
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
    const refreshScrollTriggers = () => ScrollTrigger.refresh();

    initGlobalAnimationOptimization();
    initNavbarScroll();
    initNavSectionHighlight();
    initMobileMenu();
    initAnchors();
    initPalavras();
    initPortfolio();
    initDepoimentos();
    initFaqAccordion();

    document.fonts.ready.then(() => {
        animarPagina();
        refreshScrollTriggers();

        // Restaurar o hash scroll após as animações estarem prontas
        window.requestAnimationFrame(() => {
            restoreHashScrollImmediate();
            refreshScrollTriggers();
        });
    });

    window.addEventListener("load", () => {
        refreshScrollTriggers();

        // Fazer um refresh adicional após o load para garantir sincronização
        window.requestAnimationFrame(() => {
            refreshScrollTriggers();
        });
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            refreshScrollTriggers();
        }, 150);
    });

    window.addEventListener("orientationchange", () => {
        refreshScrollTriggers();
    });
});

// =============== ANCHORS ================
function initAnchors() {
    const motion = getMotionProfile();

    document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;

        const targetId = link.getAttribute('href');
        if (!targetId) return;

        closeMobileMenu();

        event.preventDefault();

        const scrollOptions = {
            duration: motion.anchorDuration,
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

// ========== INICIALIZAÇÃO ==============
function initPalavras() {
    const palavras = ["ÚNICOS", "IMPORTANTES", "INESQUECÍVEIS"];
    const motion = getMotionProfile();
    let index = 0;
    let nextWordTimer = null;
    let restartTimer = null;
    let running = false;

    const elemento = document.getElementById("palavra-animada");
    if (!elemento) return;

    if (motion.reduce) {
        elemento.textContent = palavras[0];
        elemento.classList.remove("fade-out", "fade-in");
        return;
    }

    const clearTimers = () => {
        if (nextWordTimer) {
            window.clearTimeout(nextWordTimer);
            nextWordTimer = null;
        }

        if (restartTimer) {
            window.clearTimeout(restartTimer);
            restartTimer = null;
        }
    };

    const stop = () => {
        running = false;
        clearTimers();
    };

    const loop = () => {
        if (!running || document.hidden) return;

        elemento.classList.add("fade-out");

        nextWordTimer = window.setTimeout(() => {
            index = (index + 1) % palavras.length;
            elemento.textContent = palavras[index];

            elemento.classList.remove("fade-out");
            elemento.classList.add("fade-in");
        }, 400);

        restartTimer = window.setTimeout(() => {
            elemento.classList.remove("fade-in");
            loop();
        }, motion.lowPerformance ? 2800 : 2500);
    };

    const start = () => {
        if (running || document.hidden) return;
        running = true;
        loop();
    };

    start();
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stop();
            return;
        }

        start();
    });
}

function initPortfolio() {
    const portfolioSection = document.querySelector("#portfolio");
    const portfolioCards = Array.from(document.querySelectorAll("#portfolio .portfolio"));
    const portfolioIntro = Array.from(document.querySelectorAll("#textoPortfolio .portfolio-kicker, #textoPortfolio p"));

    if (!portfolioSection || !portfolioCards.length) return;

    const motion = getMotionProfile();
    if (motion.reduce) {
        gsap.set([...portfolioIntro, ...portfolioCards], { opacity: 1, y: 0, clearProps: "transform" });
        return;
    }

    gsap.set(portfolioIntro, { y: Math.round(36 * motion.distanceScale), autoAlpha: 0 });
    gsap.set(portfolioCards, { y: Math.round(88 * motion.distanceScale), scale: 0.96, autoAlpha: 0 });

    let portfolioPlayed = false;
    const playPortfolio = () => {
        if (portfolioPlayed) return;
        portfolioPlayed = true;

        const tl = gsap.timeline();
        tl.to(portfolioIntro, {
            y: 0,
            autoAlpha: 1,
            duration: 0.8 * motion.durationScale,
            stagger: 0.08 * motion.staggerScale,
            ease: "power2.out"
        }).to(portfolioCards, {
            y: 0,
            scale: 1,
            autoAlpha: 1,
            duration: 0.9 * motion.durationScale,
            stagger: 0.12 * motion.staggerScale,
            ease: "power3.out"
        }, "-=0.35");
    };

    const portfolioStart = isPhoneViewport() ? "top 62%" : isMobileViewport() ? "top 70%" : "top 78%";

    ScrollTrigger.create({
        trigger: portfolioSection,
        start: portfolioStart,
        onEnter: playPortfolio,
        onEnterBack: playPortfolio,
        once: true,
        invalidateOnRefresh: true
    });

    const viewportThreshold = isPhoneViewport() ? 0.35 : 0.15;
    if (ScrollTrigger.isInViewport(portfolioSection, viewportThreshold)) {
        playPortfolio();
    }

}

function initDepoimentos() {
    const motion = getMotionProfile();
    const depoimentosSection = document.getElementById("depoimentos");
    const viewport = document.getElementById("depoimentosViewport");
    const prevButton = document.querySelector(".depoimentos-seta--anterior");
    const nextButton = document.querySelector(".depoimentos-seta--proxima");
    const dotsContainer = document.getElementById("depoimentosDots");
    const depoimentos = Array.from(document.querySelectorAll("#depoimentosViewport .depoimento"));

    if (!depoimentosSection || !viewport || !prevButton || !nextButton || !dotsContainer || depoimentos.length <= 1) return;

    let activeIndex = 0;
    let autoplayTimer = null;
    let isDepoimentosInView = false;
    let isPageVisible = !document.hidden;
    let pointerStartX = 0;
    let pointerDeltaX = 0;
    let pointerIsDown = false;

    const canRunDepoimentos = () => isDepoimentosInView && isPageVisible;
    const isCompactDepoimentosViewport = () => window.matchMedia("(max-width: 767px)").matches;

    const dots = depoimentos.map((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "depoimentos-dot";
        dot.setAttribute("aria-label", `Mostrar depoimento ${index + 1}`);
        dotsContainer.appendChild(dot);
        return dot;
    });

    const updateViewportHeight = () => {
        if (!canRunDepoimentos()) return;

        if (isCompactDepoimentosViewport()) {
            viewport.style.height = "auto";
            return;
        }

        const activeDepoimento = depoimentos[activeIndex];
        if (!activeDepoimento) return;

        const minHeight = parseFloat(window.getComputedStyle(viewport).minHeight) || 0;
        const maxHeight = isCompactDepoimentosViewport()
            ? Math.max(220, Math.round(window.innerHeight * 0.4))
            : Number.POSITIVE_INFINITY;
        const nextHeight = Math.max(activeDepoimento.scrollHeight, minHeight);
        viewport.style.height = `${Math.min(nextHeight, maxHeight)}px`;
    };

    const updateActiveDepoimento = (nextIndex) => {
        activeIndex = (nextIndex + depoimentos.length) % depoimentos.length;

        depoimentos.forEach((depoimento, index) => {
            const isActive = index === activeIndex;
            depoimento.classList.toggle("is-active", isActive);
            depoimento.setAttribute("aria-hidden", String(!isActive));
        });

        dots.forEach((dot, index) => {
            dot.classList.toggle("is-active", index === activeIndex);
        });

        if (canRunDepoimentos()) {
            window.requestAnimationFrame(updateViewportHeight);
        }
    };

    const stopAutoplay = () => {
        if (autoplayTimer) {
            window.clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    };

    const restartAutoplay = () => {
        stopAutoplay();

        if (!canRunDepoimentos()) return;

        autoplayTimer = window.setInterval(() => {
            if (!canRunDepoimentos()) return;
            updateActiveDepoimento(activeIndex + 1);
        }, motion.depoimentosInterval);
    };

    const syncDepoimentosPlayback = () => {
        if (canRunDepoimentos()) {
            viewport.classList.add("is-in-view");
            window.requestAnimationFrame(updateViewportHeight);
            restartAutoplay();
            return;
        }

        viewport.classList.remove("is-in-view");
        stopAutoplay();
    };

    const goToNext = () => {
        updateActiveDepoimento(activeIndex + 1);
        restartAutoplay();
    };

    const goToPrevious = () => {
        updateActiveDepoimento(activeIndex - 1);
        restartAutoplay();
    };

    nextButton.addEventListener("click", goToNext);
    prevButton.addEventListener("click", goToPrevious);

    dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
            updateActiveDepoimento(index);
            restartAutoplay();
        });
    });

    viewport.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        pointerIsDown = true;
        pointerStartX = event.clientX;
        pointerDeltaX = 0;
        viewport.classList.add("is-dragging");
        viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener("pointermove", (event) => {
        if (!pointerIsDown) return;
        pointerDeltaX = event.clientX - pointerStartX;
    });

    const endPointerGesture = () => {
        if (!pointerIsDown) return;

        pointerIsDown = false;
        viewport.classList.remove("is-dragging");

        const swipeThreshold = 45;

        if (pointerDeltaX >= swipeThreshold) {
            goToPrevious();
        } else if (pointerDeltaX <= -swipeThreshold) {
            goToNext();
        }
    };

    viewport.addEventListener("pointerup", endPointerGesture);
    viewport.addEventListener("pointercancel", endPointerGesture);
    viewport.addEventListener("pointerleave", endPointerGesture);

    window.addEventListener("resize", updateViewportHeight);
    window.addEventListener("orientationchange", updateViewportHeight);

    if (document.fonts?.ready) {
        document.fonts.ready.then(updateViewportHeight);
    }

    updateActiveDepoimento(0);

    const sectionRect = depoimentosSection.getBoundingClientRect();
    isDepoimentosInView = sectionRect.bottom > 0 && sectionRect.top < window.innerHeight;
    syncDepoimentosPlayback();

    // Ativar transição apenas quando seção está visível na viewport
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            isDepoimentosInView = entry.isIntersecting;
            syncDepoimentosPlayback();
        });
    }, { threshold: 0.5 });

    observer.observe(depoimentosSection);

    document.addEventListener("visibilitychange", () => {
        isPageVisible = !document.hidden;
        syncDepoimentosPlayback();
    });
}

function initFaqAccordion() {
    const faqItems = Array.from(document.querySelectorAll("#faqLista .faq-item"));
    if (!faqItems.length) return;

    const getAnswer = (item) => item.querySelector(".faq-answer");

    const closeItem = (item) => {
        const answer = getAnswer(item);
        if (!answer) return;

        answer.style.height = `${answer.scrollHeight}px`;
        item.classList.remove("is-open");

        window.requestAnimationFrame(() => {
            answer.style.height = "0px";
        });

        window.setTimeout(() => {
            if (!item.classList.contains("is-open")) {
                item.removeAttribute("open");
            }
        }, 360);
    };

    const openItem = (item) => {
        const answer = getAnswer(item);
        if (!answer) return;

        item.setAttribute("open", "");
        item.classList.add("is-open");
        answer.style.height = "0px";

        window.requestAnimationFrame(() => {
            answer.style.height = `${answer.scrollHeight}px`;
        });
    };

    faqItems.forEach((item) => {
        const summary = item.querySelector("summary");
        const answer = getAnswer(item);
        if (!summary || !answer) return;

        item.classList.remove("is-open");
        item.removeAttribute("open");
        answer.style.height = "0px";

        summary.addEventListener("click", (event) => {
            event.preventDefault();

            const isOpen = item.classList.contains("is-open");
            if (isOpen) {
                closeItem(item);
                return;
            }

            faqItems.forEach((faqItem) => {
                if (faqItem !== item && faqItem.classList.contains("is-open")) {
                    closeItem(faqItem);
                }
            });

            openItem(item);
        });
    });

    const syncOpenHeights = () => {
        faqItems.forEach((item) => {
            if (!item.classList.contains("is-open")) return;

            const answer = getAnswer(item);
            if (!answer) return;

            answer.style.height = `${answer.scrollHeight}px`;
        });
    };

    window.addEventListener("resize", syncOpenHeights);
    window.addEventListener("orientationchange", syncOpenHeights);
}

// ============== ANIMAÇÕES ===============
function animarPagina() {
    const textosAnim = document.querySelectorAll(".textoAnimado");
    const motion = getMotionProfile();
    const isMobile = isPhoneViewport();
    const isTablet = isMobileViewport();

    let startValue;
    if (isMobile) {
        startValue = "top 62%";
    } else if (isTablet) {
        startValue = "top 85%";
    } else {
        startValue = "top 100%";
    }

    const sectionStart = isMobile ? "top 48%" : isTablet ? "top 55%" : "top 50%";
    const servicesStart = isMobile ? "top 40%" : isTablet ? "top 46%" : "top 50%";

    textosAnim.forEach(textoA => {
        let textStart = startValue;
        if (textoA.matches("#textoQuemSomos h2")) {
            textStart = isMobile ? "top 50%" : isTablet ? "top 42%" : "top 62%";
        }

        // Use SplitText only when available and motion not reduced; fall back to a lightweight fade animation
        if (typeof SplitText !== "undefined" && !motion.reduce) {
            const split = new SplitText(textoA, {
                type: "lines, words, chars",
                linesClass: "split-line"
            });

            gsap.set(split.chars, { y: Math.round(40 * motion.distanceScale), opacity: 0 });

            gsap.timeline({
                scrollTrigger: {
                    trigger: textoA,
                    start: textStart,
                    toggleActions: "play none none none",
                    once: true,
                    invalidateOnRefresh: true
                }
            }).to(split.chars, {
                y: 0,
                opacity: 1,
                duration: 0.30 * motion.durationScale,
                stagger: 0.02 * motion.staggerScale,
                ease: "power2.out"
            });
        } else {
            // Lightweight fallback for reduced-motion or missing SplitText
            gsap.fromTo(textoA, { y: Math.round(40 * motion.distanceScale), autoAlpha: 0 }, {
                y: 0,
                autoAlpha: 1,
                duration: 0.35 * motion.durationScale,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: textoA,
                    start: textStart,
                    toggleActions: "play none none none",
                    once: true,
                    invalidateOnRefresh: true
                }
            });
        }
    });

    gsap.from("#hero", { opacity: 0, duration: 1 * motion.durationScale });

    gsap.from("#imgHero", {
        x: Math.round(1000 * motion.distanceScale),
        duration: 1.5 * motion.durationScale,
        ease: "power2.inOut"
    });

    gsap.to("#direitaHero", {
        y: Math.round(100 * motion.distanceScale),
        scrollTrigger: {
            trigger: "#sobre",
            start: "top bottom",
            end: "center center",
            scrub: motion.scrub
        }
    });


    const quemSomosImageTrigger = isMobile ? "#imgQuemSomos" : "#sobre";
    const quemSomosImageStart = isMobile ? "top 88%" : sectionStart;

    gsap.from("#imgQuemSomos", {
        y: Math.round(100 * motion.distanceScale),
        opacity: 0,
        duration: 1 * motion.durationScale,
        filter: "blur(6px)",
        scrollTrigger: {
            trigger: quemSomosImageTrigger,
            start: quemSomosImageStart,
            ease: "power2.inOut",
            once: true,
            invalidateOnRefresh: true
        }
    });

    if (!motion.reduce) {
        const ctaFloatTween = gsap.to("#ctaFinalImgBox img", {
            y: -Math.round(12 * motion.distanceScale),
            duration: (3.8 + motion.distanceScale * 0.4) * motion.durationScale,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            paused: true
        });

        gsap.fromTo("#ctaFinalImgBox", {
            y: Math.round(80 * motion.distanceScale),
            autoAlpha: 0
        }, {
            y: 0,
            autoAlpha: 1,
            duration: 1.05 * motion.durationScale,
            ease: "power3.out",
            overwrite: "auto",
            scrollTrigger: {
                trigger: "#ctaFinalImgBox",
                start: isPhoneViewport() ? "top 88%" : isMobile ? "top 84%" : "top 80%",
                toggleActions: "play none none none",
                once: true,
                invalidateOnRefresh: true,
                onEnter: () => ctaFloatTween.play()
            }
        });

        ScrollTrigger.create({
            trigger: "#ctaFinal",
            start: "top bottom",
            end: "bottom top",
            invalidateOnRefresh: true,
            onEnter: () => ctaFloatTween.resume(),
            onEnterBack: () => ctaFloatTween.resume(),
            onLeave: () => ctaFloatTween.pause(),
            onLeaveBack: () => ctaFloatTween.pause()
        });

        if (ScrollTrigger.isInViewport("#ctaFinal", 0.25)) {
            gsap.set("#ctaFinalImgBox", { y: 0, autoAlpha: 1 });
            ctaFloatTween.play();
        }
    } else {
        gsap.set("#ctaFinalImgBox", { y: 0, autoAlpha: 1, clearProps: "transform,opacity,visibility" });
    }


    const valoresImageTrigger = isMobile ? "#img1valor" : "#valores";
    const valoresImageStart = isMobile ? "top 88%" : sectionStart;

    const tl_valores = gsap.timeline({
        scrollTrigger: {
            trigger: valoresImageTrigger,
            start: valoresImageStart,
            once: true,
            invalidateOnRefresh: true
        }
    });

    tl_valores.from("#img1valor", {
        y: -Math.round(150 * motion.distanceScale),
        opacity: 0
    }, 0);

    tl_valores.from("#img2valor", {
        y: Math.round(150 * motion.distanceScale),
        opacity: 0
    }, 0);


    const polaroids = Array.from(document.querySelectorAll(".polaroid"));

    if (isMobile) {
        polaroids.forEach((polaroid, index) => {
            const fromX = index % 2 === 0
                ? -Math.min(window.innerWidth * 0.55, 280)
                : Math.min(window.innerWidth * 0.55, 280);

            gsap.set(polaroid, {
                x: fromX,
                scale: 0.98,
                opacity: 0
            });

            ScrollTrigger.create({
                trigger: polaroid,
                start: "top 88%",
                once: true,
                invalidateOnRefresh: true,
                onEnter: () => {
                    gsap.to(polaroid, {
                        x: 0,
                        scale: 1,
                        opacity: 1,
                        duration: 0.9 * motion.durationScale,
                        ease: "power2.out",
                        overwrite: "auto"
                    });
                }
            });
        });
    } else {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#servicosGrid",
                start: servicesStart,
                once: true,
                invalidateOnRefresh: true
            }
        });

        const floatTweens = [];

        polaroids.forEach((polaroid, index) => {
            const rotation = gsap.getProperty(polaroid, "rotation") || 0;

            tl.fromTo(polaroid, {
                rotation,
                scale: 1.4,
                opacity: 0,
                y: -Math.round(10 * motion.distanceScale)
            }, {
                rotation,
                scale: 1,
                y: 0,
                opacity: 1,
                duration: 0.3 * motion.durationScale
            }, index * (0.1 * motion.staggerScale));

            // Animação de flutuação contínua para desktop
            const floatDistance = (6 + index * 1.5) * motion.distanceScale;
            const goesUpFirst = index < 3;
            const floatTween = gsap.to(polaroid, {
                keyframes: goesUpFirst
                    ? [{ y: -floatDistance }, { y: floatDistance }, { y: -floatDistance }]
                    : [{ y: floatDistance }, { y: -floatDistance }, { y: floatDistance }],
                duration: (4 + (index % 3) * 0.45) * (motion.lowPerformance ? 1.15 : 1),
                ease: "sine.inOut",
                repeat: -1,
                delay: index * (0.1 * motion.staggerScale),
                paused: true
            });

            floatTweens.push(floatTween);
        });

        const playFloatTweens = () => {
            if (document.hidden) return;
            floatTweens.forEach((tween) => tween.resume());
        };

        const pauseFloatTweens = () => {
            floatTweens.forEach((tween) => tween.pause());
        };

        tl.eventCallback("onComplete", () => {
            if (ScrollTrigger.isInViewport("#servicos", 0.05)) {
                playFloatTweens();
            }
        });

        ScrollTrigger.create({
            trigger: "#servicos",
            start: "top bottom",
            end: "bottom top",
            onEnter: playFloatTweens,
            onEnterBack: playFloatTweens,
            onLeave: pauseFloatTweens,
            onLeaveBack: pauseFloatTweens
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                pauseFloatTweens();
                return;
            }

            if (ScrollTrigger.isInViewport("#servicos", 0.05)) {
                playFloatTweens();
            }
        });
    }
}

function initMobileMenu() {
    const menuToggle = document.getElementById("menu-toggle");
    if (!menuToggle) return;

    const syncMenuState = () => {
        document.body.classList.toggle("menu-open", menuToggle.checked && isPhoneViewport());
    };

    menuToggle.addEventListener("change", syncMenuState);
    window.addEventListener("resize", syncMenuState);
    syncMenuState();
}

function closeMobileMenu() {
    const menuToggle = document.getElementById("menu-toggle");
    const nav = document.querySelector("nav");
    if (!menuToggle) return;

    if (menuToggle.checked) {
        menuToggle.checked = false;
    }
    document.body.classList.remove("menu-open");
    nav?.classList.remove("hide");
}
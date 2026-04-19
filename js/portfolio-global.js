gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

const TABLET_BREAKPOINT = 1019;

let smoother = null;

function isMobileViewport() {
    return window.innerWidth <= TABLET_BREAKPOINT;
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

document.addEventListener("DOMContentLoaded", () => {
    initPortfolioGalleryLightbox();
    setupSmoother();
});

function initPortfolioGalleryLightbox() {
    const gallery = document.querySelector(".portfolio-gallery, .ensaios-gallery");
    if (!gallery) return;

    const galleryImages = Array.from(gallery.querySelectorAll("img"));
    if (!galleryImages.length) return;

    const viewer = document.createElement("div");
    viewer.className = "gallery-viewer";
    viewer.innerHTML = `
        <div class="gallery-viewer__backdrop" data-close></div>
        <div class="gallery-viewer__chrome" role="dialog" aria-modal="true" aria-label="Visualizador de fotos">
            <button type="button" class="gallery-viewer__button gallery-viewer__close" aria-label="Fechar visualizador">x</button>
            <button type="button" class="gallery-viewer__button gallery-viewer__prev" aria-label="Foto anterior">&lt;</button>
            <figure class="gallery-viewer__frame">
                <img class="gallery-viewer__image" alt="" />
                <figcaption class="gallery-viewer__counter"></figcaption>
            </figure>
            <button type="button" class="gallery-viewer__button gallery-viewer__next" aria-label="Proxima foto">&gt;</button>
            <div class="gallery-viewer__tools" aria-label="Controles de zoom">
                <button type="button" class="gallery-viewer__button gallery-viewer__zoom-out" aria-label="Diminuir zoom">-</button>
                <button type="button" class="gallery-viewer__button gallery-viewer__zoom-reset" aria-label="Redefinir zoom">1x</button>
                <button type="button" class="gallery-viewer__button gallery-viewer__zoom-in" aria-label="Aumentar zoom">+</button>
            </div>
        </div>
    `;

    document.body.appendChild(viewer);

    const imageElement = viewer.querySelector(".gallery-viewer__image");
    const counterElement = viewer.querySelector(".gallery-viewer__counter");
    const closeButton = viewer.querySelector(".gallery-viewer__close");
    const prevButton = viewer.querySelector(".gallery-viewer__prev");
    const nextButton = viewer.querySelector(".gallery-viewer__next");
    const zoomOutButton = viewer.querySelector(".gallery-viewer__zoom-out");
    const zoomResetButton = viewer.querySelector(".gallery-viewer__zoom-reset");
    const zoomInButton = viewer.querySelector(".gallery-viewer__zoom-in");
    const backdrop = viewer.querySelector(".gallery-viewer__backdrop");
    const frame = viewer.querySelector(".gallery-viewer__frame");

    let currentIndex = 0;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isOpen = false;
    let gesture = null;
    const activePointers = new Map();

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const wrapIndex = (index) => (index + galleryImages.length) % galleryImages.length;

    const updateCounter = () => {
        const current = String(currentIndex + 1).padStart(2, "0");
        const total = String(galleryImages.length).padStart(2, "0");
        counterElement.textContent = `${current} / ${total}`;
    };

    const applyTransform = (animate = true) => {
        imageElement.style.transition = animate ? "transform 180ms ease, opacity 180ms ease" : "none";
        imageElement.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
    };

    const resetTransform = (animate = false) => {
        zoom = 1;
        panX = 0;
        panY = 0;
        applyTransform(animate);
    };

    const setImageFromIndex = (index) => {
        currentIndex = wrapIndex(index);
        const source = galleryImages[currentIndex];
        viewer.classList.add("is-switching");
        imageElement.style.opacity = "0";

        let loaded = false;
        const handleImageLoad = () => {
            if (loaded) return;
            loaded = true;
            updateCounter();
            resetTransform(false);
            requestAnimationFrame(() => {
                imageElement.style.opacity = "1";
                viewer.classList.remove("is-switching");
            });
        };

        imageElement.onload = handleImageLoad;

        imageElement.src = source.currentSrc || source.src;
        imageElement.alt = source.alt || `Imagem ${currentIndex + 1}`;

        if (imageElement.complete) {
            handleImageLoad();
        }
    };

    const showNext = () => setImageFromIndex(currentIndex + 1);
    const showPrev = () => setImageFromIndex(currentIndex - 1);

    const openViewer = (index) => {
        if (isOpen) {
            setImageFromIndex(index);
            return;
        }

        isOpen = true;
        document.body.classList.add("viewer-open");
        document.documentElement.classList.add("viewer-open");
        viewer.classList.add("is-open");
        setImageFromIndex(index);
    };

    const closeViewer = () => {
        if (!isOpen) return;

        isOpen = false;
        gesture = null;
        activePointers.clear();
        document.body.classList.remove("viewer-open");
        document.documentElement.classList.remove("viewer-open");
        viewer.classList.remove("is-open");
        resetTransform(false);
    };

    const zoomImage = (nextZoom) => {
        zoom = clamp(nextZoom, 1, 4);
        if (zoom === 1) {
            panX = 0;
            panY = 0;
        }
        applyTransform(true);
    };

    const toggleZoom = () => {
        if (zoom > 1) {
            zoomImage(1);
            return;
        }

        zoomImage(2.2);
    };

    galleryImages.forEach((image, index) => {
        image.setAttribute("tabindex", "0");
        image.setAttribute("role", "button");
        image.setAttribute("aria-label", `Abrir foto ${index + 1}`);

        image.addEventListener("click", () => openViewer(index));
        image.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openViewer(index);
            }
        });
    });

    closeButton.addEventListener("click", closeViewer);
    backdrop.addEventListener("click", closeViewer);
    prevButton.addEventListener("click", showPrev);
    nextButton.addEventListener("click", showNext);
    zoomOutButton.addEventListener("click", () => zoomImage(zoom - 0.35));
    zoomResetButton.addEventListener("click", () => zoomImage(1));
    zoomInButton.addEventListener("click", () => zoomImage(zoom + 0.35));

    imageElement.addEventListener("dblclick", toggleZoom);

    frame.addEventListener("wheel", (event) => {
        if (!isOpen) return;

        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.18 : -0.18;
        zoomImage(zoom + delta);
    }, { passive: false });

    frame.addEventListener("pointerdown", (event) => {
        if (!isOpen || event.target.closest(".gallery-viewer__button")) return;

        frame.setPointerCapture?.(event.pointerId);
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (activePointers.size === 1) {
            gesture = {
                type: zoom > 1 ? "pan" : "swipe",
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startPanX: panX,
                startPanY: panY,
                startZoom: zoom
            };
            imageElement.style.transition = "none";
        }

        if (activePointers.size === 2) {
            const points = Array.from(activePointers.values());
            const first = points[0];
            const second = points[1];

            gesture = {
                type: "pinch",
                startDistance: Math.hypot(second.x - first.x, second.y - first.y) || 1,
                startZoom: zoom,
                startPanX: panX,
                startPanY: panY,
                startMidX: (first.x + second.x) / 2,
                startMidY: (first.y + second.y) / 2
            };
            imageElement.style.transition = "none";
        }
    });

    frame.addEventListener("pointermove", (event) => {
        if (!isOpen || !gesture || !activePointers.has(event.pointerId)) return;

        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (gesture.type === "pinch" && activePointers.size >= 2) {
            const points = Array.from(activePointers.values());
            const first = points[0];
            const second = points[1];
            const distance = Math.hypot(second.x - first.x, second.y - first.y) || 1;
            const midX = (first.x + second.x) / 2;
            const midY = (first.y + second.y) / 2;

            zoom = clamp(gesture.startZoom * (distance / gesture.startDistance), 1, 4);
            panX = gesture.startPanX + (midX - gesture.startMidX);
            panY = gesture.startPanY + (midY - gesture.startMidY);
            applyTransform(false);
            return;
        }

        if (gesture.type === "pan") {
            panX = gesture.startPanX + (event.clientX - gesture.startX);
            panY = gesture.startPanY + (event.clientY - gesture.startY);
            applyTransform(false);
            return;
        }

        if (gesture.type === "swipe") {
            const dx = event.clientX - gesture.startX;
            const dy = event.clientY - gesture.startY;
            panX = dx;
            panY = dy * 0.25;
            applyTransform(false);
        }
    });

    const finishGesture = (event) => {
        if (!activePointers.has(event.pointerId)) return;

        activePointers.delete(event.pointerId);

        if (!gesture) return;

        if (gesture.type === "swipe") {
            const dx = event.clientX - gesture.startX;
            const dy = event.clientY - gesture.startY;

            if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) {
                    showNext();
                } else {
                    showPrev();
                }
            } else {
                panX = 0;
                panY = 0;
                applyTransform(true);
            }
        }

        if (gesture.type === "pan" || gesture.type === "pinch") {
            if (zoom <= 1.02) {
                resetTransform(true);
            } else {
                const maxOffset = Math.max(80, 220 * (zoom - 1));
                panX = clamp(panX, -maxOffset, maxOffset);
                panY = clamp(panY, -maxOffset, maxOffset);
                applyTransform(true);
            }
        }

        gesture = null;
    };

    frame.addEventListener("pointerup", finishGesture);
    frame.addEventListener("pointercancel", finishGesture);

    document.addEventListener("keydown", (event) => {
        if (!isOpen) return;

        if (event.key === "Escape") {
            closeViewer();
            return;
        }

        if (event.key === "ArrowRight") {
            showNext();
            return;
        }

        if (event.key === "ArrowLeft") {
            showPrev();
            return;
        }

        if (event.key === "+" || event.key === "=") {
            zoomImage(zoom + 0.35);
            return;
        }

        if (event.key === "-") {
            zoomImage(zoom - 0.35);
        }
    });
}
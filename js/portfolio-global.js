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
            <button type="button" class="gallery-viewer__button gallery-viewer__close" aria-label="Fechar visualizador">
                <img src="icon/cruz.svg" alt="" aria-hidden="true" />
            </button>
            <button type="button" class="gallery-viewer__button gallery-viewer__prev" aria-label="Foto anterior">
                <img src="icon/seta-pequena-direita.svg" alt="" aria-hidden="true" />
            </button>
            <figure class="gallery-viewer__frame">
                <img class="gallery-viewer__image" alt="" />
                <figcaption class="gallery-viewer__counter"></figcaption>
            </figure>
            <button type="button" class="gallery-viewer__button gallery-viewer__next" aria-label="Proxima foto">
                <img src="icon/seta-pequena-direita.svg" alt="" aria-hidden="true" />
            </button>
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
    const previewImageElement = document.createElement("img");
    previewImageElement.className = "gallery-viewer__image gallery-viewer__image--preview";
    previewImageElement.alt = "";
    previewImageElement.setAttribute("aria-hidden", "true");
    frame.insertBefore(previewImageElement, imageElement);

    let currentIndex = 0;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isOpen = false;
    let gesture = null;
    const activePointers = new Map();
    let switchToken = 0;
    let swipePreviewIndex = null;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const wrapIndex = (index) => (index + galleryImages.length) % galleryImages.length;

    const updateCounter = () => {
        const current = String(currentIndex + 1).padStart(2, "0");
        const total = String(galleryImages.length).padStart(2, "0");
        counterElement.textContent = `${current} / ${total}`;
    };

    const getImageData = (index) => {
        const wrappedIndex = wrapIndex(index);
        const source = galleryImages[wrappedIndex];
        return {
            wrappedIndex,
            src: source.currentSrc || source.src,
            alt: source.alt || `Imagem ${wrappedIndex + 1}`
        };
    };

    const applyTransform = (animate = true) => {
        imageElement.style.transition = animate ? "transform 180ms ease, opacity 180ms ease" : "none";
        imageElement.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`;
    };

    const applySwipeMainImageStyle = (dx) => {
        const widthFactor = Math.max(frame.clientWidth * 0.62, 260);
        const progress = clamp(Math.abs(dx) / widthFactor, 0, 1);
        const opacity = 1 - progress * 0.48;
        const blurPx = progress * 1.2;

        imageElement.style.transition = "none";
        imageElement.style.opacity = String(opacity);
        imageElement.style.filter = `blur(${blurPx}px)`;
    };

    const resetSwipeMainImageStyle = (animate = true) => {
        if (animate) {
            imageElement.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1)";
        } else {
            imageElement.style.transition = "none";
        }

        imageElement.style.opacity = "1";
        imageElement.style.filter = "blur(0px)";
    };

    const resetTransform = (animate = false) => {
        zoom = 1;
        panX = 0;
        panY = 0;
        applyTransform(animate);
        resetSwipeMainImageStyle(animate);
    };

    const clearSwipePreview = (animate = true) => {
        if (animate) {
            previewImageElement.style.transition = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1)";
        } else {
            previewImageElement.style.transition = "none";
        }

        previewImageElement.style.opacity = "0";
        previewImageElement.style.transform = "translate3d(0px, 0px, 0) scale(0.96)";
        previewImageElement.style.filter = "blur(2px)";
        swipePreviewIndex = null;
    };

    const updateSwipePreview = (dx) => {
        if (zoom > 1) return;

        const absDx = Math.abs(dx);
        if (absDx < 8) {
            clearSwipePreview(false);
            return;
        }

        const direction = dx < 0 ? 1 : -1;
        const targetIndex = wrapIndex(currentIndex + direction);
        const { src, alt } = getImageData(targetIndex);

        if (swipePreviewIndex !== targetIndex) {
            swipePreviewIndex = targetIndex;
            previewImageElement.src = src;
            previewImageElement.alt = alt;
        }

        const widthFactor = Math.max(frame.clientWidth * 0.38, 180);
        const progress = clamp(absDx / widthFactor, 0, 1);
        const offsetX = direction > 0
            ? (1 - progress) * 96
            : -(1 - progress) * 96;
        const scale = 0.94 + progress * 0.06;
        const opacity = 0.12 + progress * 0.88;

        previewImageElement.style.transition = "none";
        previewImageElement.style.opacity = String(opacity);
        previewImageElement.style.transform = `translate3d(${offsetX}px, 0, 0) scale(${scale})`;
        previewImageElement.style.filter = `blur(${(1 - progress) * 2}px)`;
    };

    const setImageFromIndex = (index) => {
        const token = ++switchToken;
        const nextIndex = wrapIndex(index);
        const { src, alt } = getImageData(nextIndex);
        clearSwipePreview(false);
        resetSwipeMainImageStyle(false);
        viewer.classList.add("is-switching");
        const preloadImage = new Image();
        preloadImage.decoding = "async";

        let loaded = false;
        const handleImageReady = () => {
            if (loaded || token !== switchToken) return;
            loaded = true;

            currentIndex = nextIndex;
            imageElement.alt = alt;
            imageElement.src = src;
            updateCounter();
            resetTransform(false);

            imageElement.style.transition = "opacity 360ms cubic-bezier(0.22, 1, 0.36, 1), filter 360ms cubic-bezier(0.22, 1, 0.36, 1)";
            imageElement.style.filter = "blur(0px)";
            requestAnimationFrame(() => {
                imageElement.style.opacity = "1";
                viewer.classList.remove("is-switching");
            });
        };

        preloadImage.onload = handleImageReady;
        preloadImage.src = src;

        if (preloadImage.complete && preloadImage.naturalWidth > 0) {
            handleImageReady();
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
        clearSwipePreview(false);
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
            applySwipeMainImageStyle(dx);
            updateSwipePreview(dx);
        }
    });

    const finishGesture = (event) => {
        if (!activePointers.has(event.pointerId)) return;

        activePointers.delete(event.pointerId);

        if (!gesture) return;

        if (gesture.type === "swipe") {
            const dx = event.clientX - gesture.startX;
            const dy = event.clientY - gesture.startY;
            const swipeCommitDistance = Math.max(95, frame.clientWidth * 0.12);

            if (Math.abs(dx) > swipeCommitDistance && Math.abs(dx) > Math.abs(dy)) {
                clearSwipePreview(false);
                resetSwipeMainImageStyle(false);
                if (dx < 0) {
                    showNext();
                } else {
                    showPrev();
                }
            } else {
                panX = 0;
                panY = 0;
                applyTransform(true);
                resetSwipeMainImageStyle(true);
                clearSwipePreview(true);
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
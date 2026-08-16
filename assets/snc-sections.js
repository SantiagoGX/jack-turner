(() => {
  'use strict';

  const registry = {};
  const instances = new WeakMap();
  const globals = {
    filtersInitialized: false
  };

  function makeTracker() {
    const listeners = [];
    const intervals = [];
    const timeouts = [];

    const on = (target, event, handler, options) => {
      if (!target) return;
      target.addEventListener(event, handler, options);
      listeners.push({ target, event, handler, options });
    };

    const setIntervalTracked = (fn, delay) => {
      const id = setInterval(fn, delay);
      intervals.push(id);
      return id;
    };

    const setTimeoutTracked = (fn, delay) => {
      const id = setTimeout(fn, delay);
      timeouts.push(id);
      return id;
    };

    const cleanup = () => {
      listeners.forEach(({ target, event, handler, options }) => {
        target.removeEventListener(event, handler, options);
      });
      intervals.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
    };

    return { on, setIntervalTracked, setTimeoutTracked, cleanup };
  }

  function initSection(section) {
    if (!section || instances.has(section)) return;
    const type = section.dataset.sectionType;
    const initFn = registry[type];
    if (!initFn) return;
    const instance = initFn(section);
    if (instance && typeof instance.cleanup === 'function') {
      instances.set(section, instance);
    }
  }

  function initAll(root) {
    if (!root) return;
    root.querySelectorAll('[data-section-type]').forEach(initSection);
  }

  function destroySection(section) {
    if (!section) return;
    const instance = instances.get(section);
    if (instance && typeof instance.cleanup === 'function') {
      instance.cleanup();
    }
    instances.delete(section);
  }

  function destroyAll(root) {
    if (!root) return;
    root.querySelectorAll('[data-section-type]').forEach(destroySection);
  }

  const api = {
    register(type, initFn) {
      registry[type] = initFn;
    },
    initAll,
    destroyAll
  };

  window.SncSections = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll(document), { once: true });
  } else {
    initAll(document);
  }

  document.addEventListener('shopify:section:load', (event) => initAll(event.target));
  document.addEventListener('shopify:section:unload', (event) => destroyAll(event.target));

  const FAVORITES_KEY = 'snc_favorites';

  function getFavorites() {
    try {
      const raw = window.localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(list) {
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function updateWishlistCounts(count) {
    if (typeof count !== 'number') return;
    document.querySelectorAll('.custom-header--wishlist-count').forEach((badge) => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
      badge.classList.remove('is-bumping');
      void badge.offsetWidth;
      badge.classList.add('is-bumping');
    });
    const burgerBadge = document.querySelector('.custom-header--burger-wishlist-count');
    if (burgerBadge) {
      burgerBadge.textContent = count;
      burgerBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  function formatMoney(cents) {
    if (!cents) return '$0.00';
    return '$' + (cents / 100).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,').replace('.00', '');
  }

  function updateCartCount() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/cart.js', true);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const cartData = JSON.parse(xhr.responseText);
          const itemCount = cartData.item_count;

          const cartButtons = document.querySelectorAll('.custom-header--cart-button, .custom-header--icon-button[aria-label*="carrito"], .custom-header--icon-button[aria-label*="Carrito"], .custom-header--icon-button[aria-label*="Cart"], .custom-header--icon-button[aria-label*="cart"]');

          cartButtons.forEach(function(btn) {
            let countEl = btn.querySelector('.custom-header--cart-count');

            if (itemCount > 0) {
              if (!countEl) {
                countEl = document.createElement('span');
                countEl.className = 'custom-header--cart-count';
                countEl.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#0d0d0d;color:white;border-radius:50%;width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:bold;';
                btn.style.position = 'relative';
                btn.appendChild(countEl);
              }
              countEl.textContent = itemCount;
              countEl.style.display = 'flex';
              countEl.classList.remove('is-bumping');
              void countEl.offsetWidth;
              countEl.classList.add('is-bumping');
            } else if (countEl) {
              countEl.style.display = 'none';
            }
          });

          document.querySelectorAll('.custom-header--cart-count').forEach(function(countEl) {
            if (itemCount > 0) {
              countEl.textContent = itemCount;
              countEl.style.display = 'flex';
              countEl.classList.remove('is-bumping');
              void countEl.offsetWidth;
              countEl.classList.add('is-bumping');
            } else {
              countEl.style.display = 'none';
            }
          });

          if (typeof window.updateSideCart === 'function') {
            window.updateSideCart();
          }
        } catch (e) {}
      }
    };

    xhr.send();
  }

  window.updateCartCount = updateCartCount;

  api.register('snc-hero-slider', (section) => {
    const { on, setIntervalTracked, cleanup } = makeTracker();
    const sliderRoot = section;
    const track = sliderRoot.querySelector('.snc-hero-slider--track');
    const slides = sliderRoot.querySelectorAll('.snc-hero-slider--slide');
    if (!track || slides.length === 0) return { cleanup };

    const dots = sliderRoot.querySelectorAll('.snc-hero-slider--dot');
    const prevBtn = sliderRoot.querySelector('.snc-hero-slider--arrow.prev');
    const nextBtn = sliderRoot.querySelector('.snc-hero-slider--arrow.next');
    const autoplay = sliderRoot.dataset.autoplay === 'true';
    const speed = parseInt(sliderRoot.dataset.speed, 10) || 5000;
    const animationType = sliderRoot.dataset.animation;
    const isDesignMode = window.Shopify && Shopify.designMode;

    let currentIndex = 0;
    let slideInterval = null;

    function goToSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;

      if (animationType === 'fade') {
        slides.forEach((slide, i) => {
          slide.classList.toggle('is-active', i === index);
        });
      } else {
        track.style.transform = `translateX(-${index * 100}%)`;
      }

      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === index);
      });
      currentIndex = index;
    }

    function startAutoplay() {
      if (!autoplay || isDesignMode) return;
      stopAutoplay();
      slideInterval = setIntervalTracked(() => {
        goToSlide(currentIndex + 1);
      }, speed);
    }

    function stopAutoplay() {
      if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
      }
    }

    if (prevBtn) {
      on(prevBtn, 'click', () => {
        goToSlide(currentIndex - 1);
        stopAutoplay();
      });
    }

    if (nextBtn) {
      on(nextBtn, 'click', () => {
        goToSlide(currentIndex + 1);
        stopAutoplay();
      });
    }

    dots.forEach((dot, index) => {
      on(dot, 'click', () => {
        goToSlide(index);
        stopAutoplay();
      });
    });

    on(sliderRoot, 'mouseenter', stopAutoplay);
    on(sliderRoot, 'mouseleave', startAutoplay);

    if (animationType === 'fade' && slides.length > 0) {
      slides[0].classList.add('is-active');
    }

    startAutoplay();

    return { cleanup };
  });

  api.register('snc-icon-text-carousel', (section) => {
    const { on, cleanup } = makeTracker();
    const wrapper = section.querySelector('[data-carousel-wrapper]');
    const textContainer = section.querySelector('[data-text-container]');
    const prevBtn = section.querySelector('[data-prev]');
    const nextBtn = section.querySelector('[data-next]');
    const pagination = section.querySelector('[data-pagination]');
    if (!wrapper || !textContainer) return { cleanup };

    const imageSlides = Array.from(wrapper.querySelectorAll('.snc-itc--image-slide'));
    const textSlides = Array.from(textContainer.querySelectorAll('.snc-itc--text-slide'));
    const totalSlides = imageSlides.length;
    if (totalSlides < 2) return { cleanup };

    let currentIndex = 0;

    if (pagination) {
      pagination.innerHTML = '';
      for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'snc-itc--dot';
        on(dot, 'click', () => {
          currentIndex = i;
          updateSlides();
        });
        pagination.appendChild(dot);
      }
    }

    function updateSlides() {
      imageSlides.forEach((slide) => {
        slide.classList.remove('is-active');
        const textSlide = textSlides.find(ts => ts.dataset.textFor === slide.dataset.imageId);
        if (textSlide) {
          textSlide.classList.remove('is-active');
        }
      });

      const activeSlide = imageSlides[currentIndex];
      const activeText = textSlides.find(ts => ts.dataset.textFor === activeSlide.dataset.imageId);

      activeSlide.classList.add('is-active');
      if (activeText) activeText.classList.add('is-active');

      if (pagination) {
        const dots = pagination.querySelectorAll('.snc-itc--dot');
        dots.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === currentIndex);
        });
      }
    }

    function goToNext() {
      currentIndex = (currentIndex + 1) % totalSlides;
      updateSlides();
    }

    function goToPrev() {
      currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
      updateSlides();
    }

    on(wrapper, 'click', goToNext);
    if (nextBtn) on(nextBtn, 'click', goToNext);
    if (prevBtn) on(prevBtn, 'click', goToPrev);

    updateSlides();

    const parallaxEnabled = section.dataset.parallaxEnabled === 'true';
    const parallaxIntensity = parseInt(section.dataset.parallaxIntensity, 10) || 100;
    const isDesignMode = window.Shopify && Shopify.designMode;
    if (parallaxEnabled && !isDesignMode) {
      function handleParallax() {
        const activeImage = section.querySelector('.snc-itc--image-slide.is-active img');
        if (!activeImage) return;

        const sectionRect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        if (sectionRect.bottom < 0 || sectionRect.top > windowHeight) {
          return;
        }

        const progress = Math.max(0, Math.min(1, (windowHeight - sectionRect.top) / (windowHeight + sectionRect.height)));
        const transformY = (progress * parallaxIntensity) - (parallaxIntensity / 2);

        activeImage.style.transform = `translateY(${transformY}px)`;
      }

      on(window, 'scroll', handleParallax, { passive: true });
      handleParallax();
    }

    return { cleanup };
  });

  api.register('snc-product-carousel', (section) => {
    const { on, setTimeoutTracked, cleanup } = makeTracker();
    const container = section;
    if (!container) return { cleanup };

    function attachProductCardListeners(scope) {
      const productCards = scope.querySelectorAll('.snc-plp--product-card');
      const checkSVG = '<svg class="snc-plp--check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

      scope.querySelectorAll('.snc-plp--add-container').forEach(function(containerEl) {
        if (containerEl.dataset.sncAddInit === 'true') {
          return;
        }
        containerEl.dataset.sncAddInit = 'true';
        containerEl.addEventListener('click', function(e) {
          e.preventDefault();
        }, { capture: false });
      });

      function showAddedFeedback(card) {
        try {
          const button = card.querySelector('.snc-plp--add-button');
          const sizesInline = card.querySelector('.snc-plp--sizes-inline');
          const addContainer = card.querySelector('.snc-plp--add-container');

          if (sizesInline) {
            sizesInline.style.maxWidth = '0';
            sizesInline.style.padding = '0';
            sizesInline.style.opacity = '0';
          }

          if (button) {
            const plusIcon = button.querySelector('.snc-plp--plus-icon');
            if (plusIcon) {
              plusIcon.style.display = 'none';
            }
            button.insertAdjacentHTML('beforeend', checkSVG);
            button.style.backgroundColor = '#0d0d0d';
          }

          if (addContainer) {
            addContainer.classList.add('is-success');
          }

          setTimeout(() => {
            try {
              if (button) {
                const checkIcon = button.querySelector('.snc-plp--check-icon');
                if (checkIcon) checkIcon.remove();
                const plusIcon = button.querySelector('.snc-plp--plus-icon');
                if (plusIcon) plusIcon.style.display = '';
                button.style.backgroundColor = '';
              }
              if (sizesInline) {
                sizesInline.style.maxWidth = '';
                sizesInline.style.padding = '';
                sizesInline.style.opacity = '';
              }
              if (addContainer) {
                addContainer.classList.remove('is-success');
              }
            } catch (e) {}
          }, 2000);

        } catch (error) {}
      }

      function addToCart(variantId, card, buttonEl) {
        if (!variantId || variantId === 'null' || variantId === 'undefined') {
          return;
        }

        const numericVariantId = parseInt(variantId, 10);
        if (isNaN(numericVariantId)) {
          return;
        }

        if (buttonEl) {
          buttonEl.disabled = true;
          buttonEl.style.opacity = '0.5';
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/cart/add.js', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
          showAddedFeedback(card);
          setTimeout(function() {
            updateCartCount();
          }, 300);

          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.style.opacity = '';
          }
        };

        xhr.onerror = function() {
          showAddedFeedback(card);
          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.style.opacity = '';
          }
        };

        xhr.send(JSON.stringify({ items: [{ id: numericVariantId, quantity: 1 }] }));
      }

      productCards.forEach(function(card) {
        if (card.dataset.sncCardInit === 'true') {
          return;
        }
        card.dataset.sncCardInit = 'true';
        const addButton = card.querySelector('.snc-plp--add-button');
        const sizeOptions = card.querySelectorAll('.snc-plp--size-option');

        if (sizeOptions.length > 0) {
          sizeOptions.forEach(function(option) {
            option.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();

              if (this.disabled) {
                return false;
              }

              const variantId = this.getAttribute('data-variant-id');
              addToCart(variantId, card, this);
              return false;
            };
          });

          if (addButton) {
            addButton.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            };
          }
        } else if (addButton) {
          card.classList.add('snc-plp--single-variant');
          addButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();

            const productHandle = card.dataset.productHandle;
            if (!productHandle) return false;

            fetch('/products/' + productHandle + '.js')
              .then(response => response.json())
              .then(productData => {
                const variant = productData.variants.find(v => v.available) || productData.variants[0];
                if (variant) {
                  addToCart(variant.id, card, addButton);
                }
              })
              .catch(error => console.error('Error:', error));

            return false;
          };
        }
      });

      const qaOverlays = scope.querySelectorAll('.snc-plp--quick-add-overlay');
      qaOverlays.forEach(overlay => {
        if (overlay.dataset.sncQaInit === 'true') {
          return;
        }
        overlay.dataset.sncQaInit = 'true';
        const sizeStep = overlay.querySelector('[data-step="size"]');
        const colorStep = overlay.querySelector('[data-step="color"]');
        const variantsScript = overlay.querySelector('.snc-plp--variant-data');
        const fullBtn = overlay.querySelector('.snc-plp--qa-btn-full');

        if (sizeStep && colorStep && variantsScript) {
          const variants = JSON.parse(variantsScript.textContent);

          const sizeBtns = sizeStep.querySelectorAll('.snc-plp--qa-option');
          sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (btn.disabled) return;

              const sizeVal = btn.dataset.value;
              overlay.dataset.selectedSize = sizeVal;

              const colorBtns = colorStep.querySelectorAll('.snc-plp--qa-option');
              colorBtns.forEach(colorBtn => {
                const colorVal = colorBtn.dataset.value;
                const variant = variants.find(v => {
                  const opts = [v.option1, v.option2, v.option3];
                  return opts.includes(sizeVal) && opts.includes(colorVal);
                });

                colorBtn.disabled = !(variant && variant.available);
              });

              sizeStep.style.opacity = '0';
              setTimeout(() => {
                sizeStep.style.display = 'none';
                colorStep.style.display = 'block';
                void colorStep.offsetWidth;
                colorStep.style.opacity = '1';
              }, 200);
            });
          });

          const colorBtns = colorStep.querySelectorAll('.snc-plp--qa-option');
          colorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (btn.disabled) return;

              const colorVal = btn.dataset.value;
              const sizeVal = overlay.dataset.selectedSize;

              const variant = variants.find(v => {
                const opts = [v.option1, v.option2, v.option3];
                return opts.includes(sizeVal) && opts.includes(colorVal);
              });

              if (variant) {
                addToCart(variant.id, overlay.closest('.snc-plp--product-card'), btn);
                setTimeout(() => {
                  colorStep.style.opacity = '0';
                  setTimeout(() => {
                    colorStep.style.display = 'none';
                    sizeStep.style.display = 'block';
                    sizeStep.style.opacity = '1';
                    delete overlay.dataset.selectedSize;
                  }, 200);
                }, 2000);
              }
            });
          });
        } else if (sizeStep) {
          const sizeBtns = sizeStep.querySelectorAll('.snc-plp--qa-option');
          sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              if (btn.disabled) return;
              e.preventDefault();
              e.stopPropagation();
              const variantId = btn.dataset.variantId;
              addToCart(variantId, overlay.closest('.snc-plp--product-card'), btn);
            });
          });
        } else if (fullBtn) {
          fullBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const handle = fullBtn.dataset.addProductHandle;
            if (!handle) return;

            fetch('/products/' + handle + '.js')
              .then(response => response.json())
              .then(productData => {
                const variant = productData.variants.find(v => v.available) || productData.variants[0];
                if (variant) {
                  addToCart(variant.id, overlay.closest('.snc-plp--product-card'), fullBtn);
                }
              });
          });
        }
      });
    }

    function initWishlist(scope) {
      const btns = scope.querySelectorAll('.snc-plp--favorite-button');

      function renderState() {
        const favs = getFavorites();
        btns.forEach(btn => {
          const handle = btn.dataset.favoriteHandle;
          if (handle && favs.includes(handle)) {
            btn.classList.add('is-active');
          } else {
            btn.classList.remove('is-active');
          }
        });
        updateWishlistCounts(favs.length);
      }

      btns.forEach(btn => {
        if (btn.dataset.sncWishlistInit === 'true') {
          return;
        }
        btn.dataset.sncWishlistInit = 'true';
        btn.addEventListener('click', function(e) {
          e.preventDefault();

          this.classList.add('is-bouncing');
          this.addEventListener('animationend', () => {
            this.classList.remove('is-bouncing');
          }, { once: true });

          const handle = this.dataset.favoriteHandle;
          if (!handle) return;
          const favs = getFavorites();
          const idx = favs.indexOf(handle);
          if (idx >= 0) {
            favs.splice(idx, 1);
          } else {
            favs.push(handle);
          }
          saveFavorites(favs);
          renderState();
        });
      });

      renderState();
    }

    function initSncCarousel(containerEl) {
      if (!containerEl || containerEl.dataset.sncCarouselInit === 'true') return;
      containerEl.dataset.sncCarouselInit = 'true';

      const track = containerEl.querySelector('[data-track]');
      const prevBtn = containerEl.querySelector('[data-prev]');
      const nextBtn = containerEl.querySelector('[data-next]');
      const dotsContainer = containerEl.querySelector('[data-dots]');

      if (!track) return;

      let originalSlides = Array.from(track.querySelectorAll('.snc-carousel__slide'));
      const totalOriginals = originalSlides.length;

      if (totalOriginals === 0) return;

      const config = {
        desktop: parseInt(containerEl.dataset.visibleDesktop, 10) || 3,
        mobile: parseInt(containerEl.dataset.visibleMobile, 10) || 1
      };
      const mode = containerEl.dataset.carouselMode || 'normal';
      const isInfinite = mode === 'infinite';
      const isSemi = mode === 'semi';
      const peekEnabled = mode !== 'normal';
      const peekPercent = parseFloat(containerEl.dataset.sidePeek) || 0;
      const itemsPerGroup = () => (window.innerWidth > 768 ? config.desktop : config.mobile);
      const maxIndex = () => Math.max(0, totalOriginals - itemsPerGroup());
      const activeItems = Math.max(itemsPerGroup(), 1);

      if (totalOriginals < activeItems + 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        track.style.justifyContent = 'center';
        return;
      }

      attachProductCardListeners(containerEl);
      initWishlist(containerEl);

      let clonesCount = 0;
      if (isInfinite) {
        clonesCount = config.desktop + 2;

        const clonesStart = originalSlides.slice(-clonesCount).map(s => {
          const clone = s.cloneNode(true);
          clone.classList.add('is-clone');
          return clone;
        });

        const clonesEnd = originalSlides.slice(0, clonesCount).map(s => {
          const clone = s.cloneNode(true);
          clone.classList.add('is-clone');
          return clone;
        });

        clonesStart.reverse().forEach(clone => track.prepend(clone));
        clonesEnd.forEach(clone => track.append(clone));
      }

      let allSlides = Array.from(track.children);
      let currentIndex = isInfinite ? clonesCount : 0;
      let hasSwipedRight = false;
      let peekState = { leftActive: isInfinite, rightActive: isInfinite, peek: 0 };

      const getMetrics = () => {
        const slide = allSlides[0];
        const width = slide.getBoundingClientRect().width;
        const style = window.getComputedStyle(track);
        const gapValue = parseFloat(style.columnGap || style.gap || 0) || 0;
        return { width, gap: gapValue };
      };

      const computePeekState = (index) => {
        if (!peekEnabled) {
          return { leftActive: false, rightActive: false };
        }
        if (isInfinite) {
          return { leftActive: true, rightActive: true };
        }
        if (isSemi) {
          return { leftActive: false, rightActive: false };
        }
        const leftActive = false;
        const rightActive = false;
        return { leftActive, rightActive };
      };

      const applyPeekState = (index) => {
        const { width } = getMetrics();
        const peek = peekEnabled ? (width * (peekPercent / 100)) : 0;
        const { leftActive, rightActive } = computePeekState(index);
        const clipRight = peekEnabled ? peek * (2 - (leftActive ? 1 : 0) - (rightActive ? 1 : 0)) : 0;

        track.style.setProperty('--snc-scroll-pad-left', `${leftActive ? peek : 0}px`);
        track.style.setProperty('--snc-scroll-pad-right', `${rightActive ? peek : 0}px`);
        track.style.setProperty('--snc-clip-right', `${clipRight}px`);

        peekState = { leftActive, rightActive, peek };
        return peekState;
      };

      const clampIndex = (index) => {
        if (isInfinite) return index;
        const maxIdx = maxIndex();
        return Math.min(Math.max(index, 0), maxIdx);
      };

      const jumpToSlide = (index, smooth = true) => {
        if (!isInfinite && isSemi && index > 0) {
          hasSwipedRight = true;
        }
        const nextIndex = clampIndex(index);
        const { width, gap } = getMetrics();
        const { peek, leftActive } = applyPeekState(nextIndex);
        const offset = Math.max(0, (nextIndex * (width + gap)) - (leftActive ? peek : 0));

        track.scrollTo({
          left: offset,
          behavior: smooth ? 'smooth' : 'auto'
        });

        currentIndex = nextIndex;
        updateDots();
      };

      setTimeoutTracked(() => {
        jumpToSlide(currentIndex, false);
      }, 80);

      const updateDots = () => {
        if (!dotsContainer) return;

        if (isInfinite) {
          let realIndex = (currentIndex - clonesCount) % totalOriginals;
          if (realIndex < 0) realIndex = totalOriginals + realIndex;

          const activeDotIndex = Math.floor(realIndex / itemsPerGroup());
          const dots = dotsContainer.querySelectorAll('.snc-carousel__dot');
          dots.forEach((dot, idx) => {
            dot.classList.toggle('is-active', idx === activeDotIndex);
          });
          return;
        }

        const totalDots = Math.ceil(totalOriginals / itemsPerGroup());
        if (totalDots <= 1) return;
        const activeDotIndex = currentIndex >= maxIndex()
          ? totalDots - 1
          : Math.floor(currentIndex / itemsPerGroup());

        const dots = dotsContainer.querySelectorAll('.snc-carousel__dot');
        dots.forEach((dot, idx) => {
          dot.classList.toggle('is-active', idx === activeDotIndex);
        });
      };

      const buildDots = () => {
        if (!dotsContainer) return;

        dotsContainer.innerHTML = '';
        const totalDots = Math.ceil(totalOriginals / itemsPerGroup());

        if (totalDots <= 1) return;

        for (let i = 0; i < totalDots; i++) {
          const btn = document.createElement('button');
          btn.className = 'snc-carousel__dot';
          btn.onclick = () => {
            if (isInfinite) {
              const targetRealIndex = i * itemsPerGroup();
              jumpToSlide(clonesCount + targetRealIndex, true);
              return;
            }
            const targetIndex = Math.min(i * itemsPerGroup(), maxIndex());
            jumpToSlide(targetIndex, true);
          };
          dotsContainer.appendChild(btn);
        }
        updateDots();
      };

      let scrollTimeout;

      track.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const { width, gap } = getMetrics();
          const scrollLeft = track.scrollLeft;
          const offset = peekState.leftActive ? peekState.peek : 0;
          let index = Math.round((scrollLeft + offset) / (width + gap));

          if (isInfinite) {
            currentIndex = index;

            if (currentIndex < clonesCount) {
              const newIndex = currentIndex + totalOriginals;
              jumpToSlide(newIndex, false);
            }
            else if (currentIndex >= clonesCount + totalOriginals) {
              const newIndex = currentIndex - totalOriginals;
              jumpToSlide(newIndex, false);
            } else {
              updateDots();
            }
            return;
          }

          index = clampIndex(index);
          if (isSemi && index > 0) {
            hasSwipedRight = true;
          }
          currentIndex = index;
          const prevLeft = peekState.leftActive;
          const prevRight = peekState.rightActive;
          applyPeekState(index);
          updateDots();

          if (prevLeft !== peekState.leftActive || prevRight !== peekState.rightActive) {
            jumpToSlide(currentIndex, false);
          }
        }, 60);
      });

      const move = (dir) => {
        const nextIndex = currentIndex + (dir * itemsPerGroup());
        jumpToSlide(nextIndex, true);
      };

      if (prevBtn) prevBtn.addEventListener('click', () => move(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => move(1));

      on(window, 'resize', () => {
        buildDots();
        jumpToSlide(currentIndex, false);
      });

      buildDots();
    }

    initSncCarousel(container);

    return { cleanup };
  });

  api.register('snc-related-carousel', (section) => {
    const { on, setTimeoutTracked, cleanup } = makeTracker();
    const container = section;
    if (!container) return { cleanup };

    function attachProductCardListeners(scope) {
      const productCards = scope.querySelectorAll('.snc-plp--product-card');
      const checkSVG = '<svg class="snc-plp--check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

      scope.querySelectorAll('.snc-plp--add-container').forEach(function(containerEl) {
        containerEl.addEventListener('click', function(e) { e.preventDefault(); }, { capture: false });
      });

      function showAddedFeedback(card) {
        try {
          const button = card.querySelector('.snc-plp--add-button');
          const sizesInline = card.querySelector('.snc-plp--sizes-inline');
          const addContainer = card.querySelector('.snc-plp--add-container');
          if (sizesInline) { sizesInline.style.maxWidth = '0'; sizesInline.style.padding = '0'; sizesInline.style.opacity = '0'; }
          if (button) {
            const plusIcon = button.querySelector('.snc-plp--plus-icon');
            if (plusIcon) plusIcon.style.display = 'none';
            button.insertAdjacentHTML('beforeend', checkSVG);
            button.style.backgroundColor = '#0d0d0d';
          }
          if (addContainer) addContainer.classList.add('is-success');
          setTimeout(() => {
            try {
              if (button) {
                const checkIcon = button.querySelector('.snc-plp--check-icon');
                if (checkIcon) checkIcon.remove();
                const plusIcon = button.querySelector('.snc-plp--plus-icon');
                if (plusIcon) plusIcon.style.display = '';
                button.style.backgroundColor = '';
              }
              if (sizesInline) {
                sizesInline.style.maxWidth = '';
                sizesInline.style.padding = '';
                sizesInline.style.opacity = '';
              }
              if (addContainer) addContainer.classList.remove('is-success');
            } catch (e) {}
          }, 2000);
        } catch (error) {}
      }

      function addToCart(variantId, card, buttonEl) {
        if (!variantId || variantId === 'null' || variantId === 'undefined') return;
        const numericVariantId = parseInt(variantId, 10);
        if (isNaN(numericVariantId)) return;

        if (buttonEl) {
          buttonEl.disabled = true;
          buttonEl.style.opacity = '0.5';
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/cart/add.js', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
          showAddedFeedback(card);
          setTimeout(function() {
            updateCartCount();
          }, 300);

          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.style.opacity = '';
          }
        };

        xhr.onerror = function() {
          showAddedFeedback(card);
          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.style.opacity = '';
          }
        };

        xhr.send(JSON.stringify({ items: [{ id: numericVariantId, quantity: 1 }] }));
      }

      productCards.forEach(function(card) {
        const addButton = card.querySelector('.snc-plp--add-button');
        const sizeOptions = card.querySelectorAll('.snc-plp--size-option');

        if (sizeOptions.length > 0) {
          sizeOptions.forEach(function(option) {
            option.onclick = function(e) {
              e.preventDefault(); e.stopPropagation();
              if (this.disabled) return false;
              addToCart(this.getAttribute('data-variant-id'), card, this);
              return false;
            };
          });
          if (addButton) {
            addButton.onclick = function(e) {
              e.preventDefault(); e.stopPropagation();
              return false;
            };
          }
        } else if (addButton) {
          card.classList.add('snc-plp--single-variant');
          addButton.onclick = function(e) {
            e.preventDefault(); e.stopPropagation();
            const productHandle = card.dataset.productHandle;
            if (!productHandle) return false;
            fetch('/products/' + productHandle + '.js').then(response => response.json()).then(productData => {
              const variant = productData.variants.find(v => v.available) || productData.variants[0];
              if (variant) addToCart(variant.id, card, addButton);
            });
            return false;
          };
        }
      });

      const qaOverlays = scope.querySelectorAll('.snc-plp--quick-add-overlay');
      qaOverlays.forEach(overlay => {
        const sizeStep = overlay.querySelector('[data-step="size"]');
        const colorStep = overlay.querySelector('[data-step="color"]');
        const variantsScript = overlay.querySelector('.snc-plp--variant-data');
        const fullBtn = overlay.querySelector('.snc-plp--qa-btn-full');

        if (sizeStep && colorStep && variantsScript) {
          const variants = JSON.parse(variantsScript.textContent);

          const sizeBtns = sizeStep.querySelectorAll('.snc-plp--qa-option');
          sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault(); e.stopPropagation();
              if (btn.disabled) return;

              const sizeVal = btn.dataset.value;
              overlay.dataset.selectedSize = sizeVal;

              const colorBtns = colorStep.querySelectorAll('.snc-plp--qa-option');
              colorBtns.forEach(colorBtn => {
                const colorVal = colorBtn.dataset.value;
                const variant = variants.find(v => {
                  const opts = [v.option1, v.option2, v.option3];
                  return opts.includes(sizeVal) && opts.includes(colorVal);
                });

                colorBtn.disabled = !(variant && variant.available);
              });

              sizeStep.style.opacity = '0';
              setTimeout(() => {
                sizeStep.style.display = 'none';
                colorStep.style.display = 'block';
                void colorStep.offsetWidth;
                colorStep.style.opacity = '1';
              }, 200);
            });
          });

          const colorBtns = colorStep.querySelectorAll('.snc-plp--qa-option');
          colorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault(); e.stopPropagation();
              if (btn.disabled) return;

              const colorVal = btn.dataset.value;
              const sizeVal = overlay.dataset.selectedSize;

              const variant = variants.find(v => {
                const opts = [v.option1, v.option2, v.option3];
                return opts.includes(sizeVal) && opts.includes(colorVal);
              });

              if (variant) {
                addToCart(variant.id, overlay.closest('.snc-plp--product-card'), btn);
                setTimeout(() => {
                  colorStep.style.opacity = '0';
                  setTimeout(() => {
                    colorStep.style.display = 'none';
                    sizeStep.style.display = 'block';
                    sizeStep.style.opacity = '1';
                    delete overlay.dataset.selectedSize;
                  }, 200);
                }, 2000);
              }
            });
          });
        } else if (sizeStep) {
          const sizeBtns = sizeStep.querySelectorAll('.snc-plp--qa-option');
          sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              if (btn.disabled) return;
              e.preventDefault(); e.stopPropagation();
              const variantId = btn.dataset.variantId;
              addToCart(variantId, overlay.closest('.snc-plp--product-card'), btn);
            });
          });
        } else if (fullBtn) {
          fullBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const handle = fullBtn.dataset.addProductHandle;
            if (!handle) return;
            fetch('/products/' + handle + '.js').then(response => response.json()).then(productData => {
              const variant = productData.variants.find(v => v.available) || productData.variants[0];
              if (variant) addToCart(variant.id, overlay.closest('.snc-plp--product-card'), fullBtn);
            });
          });
        }
      });
    }

    function initWishlist(scope) {
      const btns = scope.querySelectorAll('.snc-plp--favorite-button');
      function renderState() {
        const favs = getFavorites();
        btns.forEach(btn => { const handle = btn.dataset.favoriteHandle; if (handle && favs.includes(handle)) btn.classList.add('is-active'); else btn.classList.remove('is-active'); });
        updateWishlistCounts(favs.length);
      }
      btns.forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          this.classList.add('is-bouncing');
          this.addEventListener('animationend', () => { this.classList.remove('is-bouncing'); }, { once: true });
          const handle = this.dataset.favoriteHandle; if (!handle) return;
          const favs = getFavorites(); const idx = favs.indexOf(handle); if (idx >= 0) { favs.splice(idx, 1); } else { favs.push(handle); }
          saveFavorites(favs); renderState();
        });
      });
      renderState();
    }

    function initSncCarousel(containerEl) {
      if (!containerEl || containerEl.dataset.sncCarouselInit === 'true') return;
      containerEl.dataset.sncCarouselInit = 'true';

      const track = containerEl.querySelector('[data-track]');
      const prevBtn = containerEl.querySelector('[data-prev]');
      const nextBtn = containerEl.querySelector('[data-next]');
      const dotsContainer = containerEl.querySelector('[data-dots]');

      if (!track) return;

      let originalSlides = Array.from(track.querySelectorAll('.snc-carousel__slide'));
      const totalOriginals = originalSlides.length;

      const config = {
        desktop: parseInt(containerEl.dataset.visibleDesktop, 10) || 3,
        mobile: parseInt(containerEl.dataset.visibleMobile, 10) || 1
      };
      const mode = containerEl.dataset.carouselMode || 'normal';
      const isInfinite = mode === 'infinite';
      const isSemi = mode === 'semi';
      const peekEnabled = mode !== 'normal';
      const peekPercent = parseFloat(containerEl.dataset.sidePeek) || 0;
      const itemsPerGroup = () => (window.innerWidth > 768 ? config.desktop : config.mobile);
      const maxIndex = () => Math.max(0, totalOriginals - itemsPerGroup());

      if (totalOriginals < config.desktop + 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        track.style.justifyContent = 'center';
        return;
      }

      attachProductCardListeners(containerEl);
      initWishlist(containerEl);

      let clonesCount = 0;
      if (isInfinite) {
        clonesCount = config.desktop + 2;

        const clonesStart = originalSlides.slice(-clonesCount).map(s => {
          const clone = s.cloneNode(true);
          clone.classList.add('is-clone');
          return clone;
        });

        const clonesEnd = originalSlides.slice(0, clonesCount).map(s => {
          const clone = s.cloneNode(true);
          clone.classList.add('is-clone');
          return clone;
        });

        clonesStart.reverse().forEach(clone => track.prepend(clone));
        clonesEnd.forEach(clone => track.append(clone));
      }

      let allSlides = Array.from(track.children);
      let currentIndex = isInfinite ? clonesCount : 0;
      let hasSwipedRight = false;
      let peekState = { leftActive: isInfinite, rightActive: isInfinite, peek: 0 };

      const getMetrics = () => {
        const slide = allSlides[0];
        const width = slide.getBoundingClientRect().width;
        const style = window.getComputedStyle(track);
        const gapValue = parseFloat(style.columnGap || style.gap || 0) || 0;
        return { width, gap: gapValue };
      };

      const computePeekState = (index) => {
        if (!peekEnabled) {
          return { leftActive: false, rightActive: false };
        }
        if (isInfinite) {
          return { leftActive: true, rightActive: true };
        }
        const leftActive = isSemi && hasSwipedRight && index > 0;
        const rightActive = isSemi && index < maxIndex();
        return { leftActive, rightActive };
      };

      const applyPeekState = (index) => {
        const { width } = getMetrics();
        const peek = peekEnabled ? (width * (peekPercent / 100)) : 0;
        const { leftActive, rightActive } = computePeekState(index);
        const clipRight = peekEnabled ? peek * (2 - (leftActive ? 1 : 0) - (rightActive ? 1 : 0)) : 0;

        track.style.setProperty('--snc-scroll-pad-left', `${leftActive ? peek : 0}px`);
        track.style.setProperty('--snc-scroll-pad-right', `${rightActive ? peek : 0}px`);
        track.style.setProperty('--snc-clip-right', `${clipRight}px`);

        peekState = { leftActive, rightActive, peek };
        return peekState;
      };

      const clampIndex = (index) => {
        if (isInfinite) return index;
        const maxIdx = maxIndex();
        return Math.min(Math.max(index, 0), maxIdx);
      };

      const jumpToSlide = (index, smooth = true) => {
        if (!isInfinite && isSemi && index > 0) {
          hasSwipedRight = true;
        }
        const nextIndex = clampIndex(index);
        const { width, gap } = getMetrics();
        const { peek, leftActive } = applyPeekState(nextIndex);
        const offset = Math.max(0, (nextIndex * (width + gap)) - (leftActive ? peek : 0));

        track.scrollTo({
          left: offset,
          behavior: smooth ? 'smooth' : 'auto'
        });

        currentIndex = nextIndex;
        updateDots();
      };

      setTimeoutTracked(() => {
        jumpToSlide(currentIndex, false);
      }, 80);

      const updateDots = () => {
        if (!dotsContainer) return;

        if (isInfinite) {
          let realIndex = (currentIndex - clonesCount) % totalOriginals;
          if (realIndex < 0) realIndex = totalOriginals + realIndex;

          const activeDotIndex = Math.floor(realIndex / itemsPerGroup());
          const dots = dotsContainer.querySelectorAll('.snc-carousel__dot');
          dots.forEach((dot, idx) => {
            dot.classList.toggle('is-active', idx === activeDotIndex);
          });
          return;
        }

        const totalDots = Math.ceil(totalOriginals / itemsPerGroup());
        if (totalDots <= 1) return;
        const activeDotIndex = currentIndex >= maxIndex()
          ? totalDots - 1
          : Math.floor(currentIndex / itemsPerGroup());

        const dots = dotsContainer.querySelectorAll('.snc-carousel__dot');
        dots.forEach((dot, idx) => {
          dot.classList.toggle('is-active', idx === activeDotIndex);
        });
      };

      const buildDots = () => {
        if (!dotsContainer) return;

        dotsContainer.innerHTML = '';
        const totalDots = Math.ceil(totalOriginals / itemsPerGroup());

        if (totalDots <= 1) return;

        for (let i = 0; i < totalDots; i++) {
          const btn = document.createElement('button');
          btn.className = 'snc-carousel__dot';
          btn.onclick = () => {
            if (isInfinite) {
              const targetRealIndex = i * itemsPerGroup();
              jumpToSlide(clonesCount + targetRealIndex, true);
              return;
            }
            const targetIndex = Math.min(i * itemsPerGroup(), maxIndex());
            jumpToSlide(targetIndex, true);
          };
          dotsContainer.appendChild(btn);
        }
        updateDots();
      };

      let scrollTimeout;

      track.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const { width, gap } = getMetrics();
          const scrollLeft = track.scrollLeft;
          const offset = peekState.leftActive ? peekState.peek : 0;
          let index = Math.round((scrollLeft + offset) / (width + gap));

          if (isInfinite) {
            currentIndex = index;

            if (currentIndex < clonesCount) {
              const newIndex = currentIndex + totalOriginals;
              jumpToSlide(newIndex, false);
            }
            else if (currentIndex >= clonesCount + totalOriginals) {
              const newIndex = currentIndex - totalOriginals;
              jumpToSlide(newIndex, false);
            } else {
              updateDots();
            }
            return;
          }

          index = clampIndex(index);
          if (isSemi && index > 0) {
            hasSwipedRight = true;
          }
          currentIndex = index;
          const prevLeft = peekState.leftActive;
          const prevRight = peekState.rightActive;
          applyPeekState(index);
          updateDots();

          if (prevLeft !== peekState.leftActive || prevRight !== peekState.rightActive) {
            jumpToSlide(currentIndex, false);
          }
        }, 60);
      });

      const move = (dir) => {
        const nextIndex = currentIndex + (dir * itemsPerGroup());
        jumpToSlide(nextIndex, true);
      };

      if (prevBtn) prevBtn.addEventListener('click', () => move(-1));
      if (nextBtn) nextBtn.addEventListener('click', () => move(1));

      on(window, 'resize', () => {
        buildDots();
        jumpToSlide(currentIndex, false);
      });

      buildDots();
    }

    initSncCarousel(container);

    return { cleanup };
  });

  function initProductListSection(section, tracker) {
    const { on } = tracker;

    function attachProductCardListeners(scope) {
      const productCards = scope.querySelectorAll('.snc-plp--product-card');
      const checkSVG = '<svg class="snc-plp--check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

      scope.querySelectorAll('.snc-plp--add-container').forEach(function(containerEl) {
        containerEl.addEventListener('click', function(e) {
          e.preventDefault();
        }, { capture: false });
      });

      function showAddedFeedback(card) {
        try {
          const button = card.querySelector('.snc-plp--add-button');
          const sizesInline = card.querySelector('.snc-plp--sizes-inline');
          const addContainer = card.querySelector('.snc-plp--add-container');

          if (sizesInline) {
            sizesInline.style.maxWidth = '0';
            sizesInline.style.padding = '0';
            sizesInline.style.opacity = '0';
          }

          if (button) {
            const plusIcon = button.querySelector('.snc-plp--plus-icon');
            if (plusIcon) {
              plusIcon.style.display = 'none';
            }
            button.insertAdjacentHTML('beforeend', checkSVG);
            button.style.backgroundColor = '#0d0d0d';
          }

          if (addContainer) {
            addContainer.classList.add('is-success');
          }

          setTimeout(() => {
            try {
              if (button) {
                const checkIcon = button.querySelector('.snc-plp--check-icon');
                if (checkIcon) checkIcon.remove();
                const plusIcon = button.querySelector('.snc-plp--plus-icon');
                if (plusIcon) plusIcon.style.display = '';
                button.style.backgroundColor = '';
              }
              if (sizesInline) {
                sizesInline.style.maxWidth = '';
                sizesInline.style.padding = '';
                sizesInline.style.opacity = '';
              }
              if (addContainer) {
                addContainer.classList.remove('is-success');
              }
            } catch (e) {}
          }, 2000);
        } catch (error) {}
      }

      function addToCart(variantId, card, buttonEl) {
        if (!variantId || variantId === 'null' || variantId === 'undefined') {
          return;
        }

        const numericVariantId = parseInt(variantId, 10);
        if (isNaN(numericVariantId)) {
          return;
        }

        if (buttonEl) {
          buttonEl.disabled = true;
          buttonEl.style.opacity = '0.5';
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/cart/add.js', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
          showAddedFeedback(card);
          setTimeout(function() {
            updateCartCount();
          }, 300);

          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.style.opacity = '';
          }
        };

        xhr.onerror = function() {
          showAddedFeedback(card);
          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.style.opacity = '';
          }
        };

        xhr.send(JSON.stringify({ items: [{ id: numericVariantId, quantity: 1 }] }));
      }

      productCards.forEach(function(card) {
        const addButton = card.querySelector('.snc-plp--add-button');
        const sizeOptions = card.querySelectorAll('.snc-plp--size-option');

        if (sizeOptions.length > 0) {
          sizeOptions.forEach(function(option) {
            option.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();

              if (this.disabled) {
                return false;
              }

              const variantId = this.getAttribute('data-variant-id');
              addToCart(variantId, card, this);
              return false;
            };
          });

          if (addButton) {
            addButton.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            };
          }
        } else if (addButton) {
          card.classList.add('snc-plp--single-variant');
          addButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();

            const productHandle = card.dataset.productHandle;
            if (!productHandle) return false;

            fetch('/products/' + productHandle + '.js')
              .then(response => response.json())
              .then(productData => {
                const variant = productData.variants.find(v => v.available) || productData.variants[0];
                if (variant) {
                  addToCart(variant.id, card, addButton);
                }
              })
              .catch(error => console.error('Error:', error));

            return false;
          };
        }
      });

      const qaOverlays = scope.querySelectorAll('.snc-plp--quick-add-overlay');
      qaOverlays.forEach(overlay => {
        const sizeStep = overlay.querySelector('[data-step="size"]');
        const colorStep = overlay.querySelector('[data-step="color"]');
        const variantsScript = overlay.querySelector('.snc-plp--variant-data');
        const fullBtn = overlay.querySelector('.snc-plp--qa-btn-full');

        if (sizeStep && colorStep && variantsScript) {
          const variants = JSON.parse(variantsScript.textContent);

          const sizeBtns = sizeStep.querySelectorAll('.snc-plp--qa-option');
          sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (btn.disabled) return;

              const sizeVal = btn.dataset.value;
              overlay.dataset.selectedSize = sizeVal;

              const colorBtns = colorStep.querySelectorAll('.snc-plp--qa-option');
              colorBtns.forEach(colorBtn => {
                const colorVal = colorBtn.dataset.value;
                const variant = variants.find(v => {
                  const opts = [v.option1, v.option2, v.option3];
                  return opts.includes(sizeVal) && opts.includes(colorVal);
                });

                colorBtn.disabled = !(variant && variant.available);
              });

              sizeStep.style.opacity = '0';
              setTimeout(() => {
                sizeStep.style.display = 'none';
                colorStep.style.display = 'block';
                void colorStep.offsetWidth;
                colorStep.style.opacity = '1';
              }, 200);
            });
          });

          const colorBtns = colorStep.querySelectorAll('.snc-plp--qa-option');
          colorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (btn.disabled) return;

              const colorVal = btn.dataset.value;
              const sizeVal = overlay.dataset.selectedSize;

              const variant = variants.find(v => {
                const opts = [v.option1, v.option2, v.option3];
                return opts.includes(sizeVal) && opts.includes(colorVal);
              });

              if (variant) {
                addToCart(variant.id, overlay.closest('.snc-plp--product-card'), btn);
                setTimeout(() => {
                  colorStep.style.opacity = '0';
                  setTimeout(() => {
                    colorStep.style.display = 'none';
                    sizeStep.style.display = 'block';
                    sizeStep.style.opacity = '1';
                    delete overlay.dataset.selectedSize;
                  }, 200);
                }, 2000);
              }
            });
          });
        }
        else if (sizeStep) {
          const sizeBtns = sizeStep.querySelectorAll('.snc-plp--qa-option');
          sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              if (btn.disabled) return;
              e.preventDefault();
              e.stopPropagation();
              const variantId = btn.dataset.variantId;
              addToCart(variantId, overlay.closest('.snc-plp--product-card'), btn);
            });
          });
        }
        else if (fullBtn) {
          fullBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const handle = fullBtn.dataset.addProductHandle;
            if (!handle) return;

            fetch('/products/' + handle + '.js')
              .then(response => response.json())
              .then(productData => {
                const variant = productData.variants.find(v => v.available) || productData.variants[0];
                if (variant) {
                  addToCart(variant.id, overlay.closest('.snc-plp--product-card'), fullBtn);
                }
              });
          });
        }
      });
    }

    function initWishlist(scope) {
      const btns = scope.querySelectorAll('.snc-plp--favorite-button');

      function renderState() {
        const favs = getFavorites();
        btns.forEach(btn => {
          const handle = btn.dataset.favoriteHandle;
          if (handle && favs.includes(handle)) {
            btn.classList.add('is-active');
          } else {
            btn.classList.remove('is-active');
          }
        });
        updateWishlistCounts(favs.length);
      }

      btns.forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();

          this.classList.add('is-bouncing');
          this.addEventListener('animationend', () => {
            this.classList.remove('is-bouncing');
          }, { once: true });

          const handle = this.dataset.favoriteHandle;
          if (!handle) return;
          const favs = getFavorites();
          const idx = favs.indexOf(handle);
          if (idx >= 0) {
            favs.splice(idx, 1);
          } else {
            favs.push(handle);
          }
          saveFavorites(favs);
          renderState();
        });
      });

      renderState();
    }

    function initFilters(scope) {
      const details = scope.querySelectorAll('.snc-filter-group');

      details.forEach(targetDetail => {
        const summary = targetDetail.querySelector('summary');
        if (summary) {
          on(summary, 'click', (e) => {
            if (!targetDetail.hasAttribute('open')) {
              details.forEach(detail => {
                if (detail !== targetDetail) {
                  detail.removeAttribute('open');
                }
              });
            }
          });
        }
      });

      const form = scope.querySelector('.snc-filter-form');
      const drawerTrigger = scope.querySelector('[data-filter-drawer-trigger]');
      const drawer = scope.querySelector('[data-filter-drawer]');

      if (!form || !drawerTrigger || !drawer) return;

      const drawerCloseBtns = drawer.querySelectorAll('[data-filter-drawer-close]');
      const drawerApplyBtn = drawer.querySelector('[data-filter-drawer-apply]');
      const drawerBody = drawer.querySelector('[data-filter-drawer-body]');
      const desktopGroupsContainer = scope.querySelector('.snc-desktop-filters-wrapper');
      const escAttr = (val) => String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

      function initPriceRanges(containerEl, autoSubmit) {
        const widgets = containerEl.querySelectorAll('[data-price-range]');
        if (!widgets.length) return;

        widgets.forEach(widget => {
          const minInput = widget.querySelector('input[type="number"][data-price-input-min]');
          const maxInput = widget.querySelector('input[type="number"][data-price-input-max]');
          const minRange = widget.querySelector('input[type="range"][data-price-range-min]');
          const maxRange = widget.querySelector('input[type="range"][data-price-range-max]');
          const formEl = widget.closest('form');

          if (!minInput || !maxInput) return;

          const toNum = (v, fallback) => {
            const n = parseFloat(String(v || '').replace(/[^\d.]/g, ''));
            return Number.isFinite(n) ? n : fallback;
          };

          const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

          const syncFromInputs = () => {
            if (!minRange || !maxRange) return;
            const min = toNum(minInput.value, 0);
            const max = toNum(maxInput.value, toNum(maxRange.max, 0));
            const minClamped = clamp(min, 0, max);
            const maxClamped = clamp(max, minClamped, toNum(maxRange.max, max));

            minInput.value = minClamped ? String(minClamped) : '';
            maxInput.value = maxClamped ? String(maxClamped) : '';
            minRange.value = String(minClamped);
            maxRange.value = String(maxClamped);
          };

          const syncFromRanges = () => {
            if (!minRange || !maxRange) return;
            const min = toNum(minRange.value, 0);
            const max = toNum(maxRange.value, toNum(maxRange.max, 0));
            const minClamped = clamp(min, 0, max);
            const maxClamped = clamp(max, minClamped, toNum(maxRange.max, max));

            minRange.value = String(minClamped);
            maxRange.value = String(maxClamped);
            minInput.value = minClamped ? String(minClamped) : '';
            maxInput.value = maxClamped ? String(maxClamped) : '';
          };

          on(minInput, 'input', syncFromInputs);
          on(maxInput, 'input', syncFromInputs);

          if (minRange && maxRange) {
            on(minRange, 'input', syncFromRanges);
            on(maxRange, 'input', syncFromRanges);
            on(minRange, 'change', () => {
              syncFromRanges();
              if (autoSubmit && formEl) formEl.submit();
            });
            on(maxRange, 'change', () => {
              syncFromRanges();
              if (autoSubmit && formEl) formEl.submit();
            });
          }

          syncFromInputs();
        });
      }

      const openDrawer = () => {
        if (drawerBody.children.length === 0 && desktopGroupsContainer) {
          const clonedContent = desktopGroupsContainer.cloneNode(true);
          clonedContent.classList.remove('snc-desktop-filters-wrapper');
          clonedContent.querySelectorAll('input[onchange]').forEach(input => input.removeAttribute('onchange'));
          drawerBody.appendChild(clonedContent);
          initDrawerAccordion(drawerBody);
          initPriceRanges(drawerBody, false);
        }
        drawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      };

      const closeDrawer = () => {
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
      };

      function initDrawerAccordion(containerEl) {
        const detailsEls = containerEl.querySelectorAll('details');
        detailsEls.forEach(targetDetail => {
          const summary = targetDetail.querySelector('summary');
          const content = targetDetail.querySelector('.snc-filter-group__content');

          if (summary && content) {
            on(summary, 'click', (e) => {
              e.preventDefault();
              const isOpen = targetDetail.hasAttribute('open') && !targetDetail.classList.contains('is-closing');

              if (isOpen) {
                closeAccordion(targetDetail, content);
              } else {
                detailsEls.forEach(otherDetail => {
                  if (otherDetail !== targetDetail && otherDetail.hasAttribute('open')) {
                    const otherContent = otherDetail.querySelector('.snc-filter-group__content');
                    if (otherContent) closeAccordion(otherDetail, otherContent);
                  }
                });
                openAccordion(targetDetail, content);
              }
            });
          }
        });
      }

      function openAccordion(detail, content) {
        detail.setAttribute('open', '');
        const height = content.scrollHeight;
        content.style.height = '0px';
        content.style.overflow = 'hidden';
        content.style.transition = 'height 0.3s ease';

        requestAnimationFrame(() => {
          content.style.height = height + 'px';
        });

        content.addEventListener('transitionend', function onEnd() {
          content.style.height = 'auto';
          content.style.overflow = 'visible';
          content.removeEventListener('transitionend', onEnd);
        }, { once: true });
      }

      function closeAccordion(detail, content) {
        detail.classList.add('is-closing');
        const height = content.scrollHeight;
        content.style.height = height + 'px';
        content.style.overflow = 'hidden';
        content.style.transition = 'height 0.3s ease';

        requestAnimationFrame(() => {
          content.style.height = '0px';
        });

        content.addEventListener('transitionend', function onEnd() {
          detail.removeAttribute('open');
          detail.classList.remove('is-closing');
          content.style.height = '';
          content.style.overflow = '';
          content.style.transition = '';
          content.removeEventListener('transitionend', onEnd);
        }, { once: true });
      }

      on(drawerTrigger, 'click', openDrawer);
      drawerCloseBtns.forEach(btn => on(btn, 'click', closeDrawer));

      if (drawerApplyBtn) {
        on(drawerApplyBtn, 'click', () => {
          const drawerCheckboxes = drawerBody.querySelectorAll('input[type="checkbox"]');
          drawerCheckboxes.forEach(drawerInput => {
            const originalInput = desktopGroupsContainer.querySelector(`input[name="${drawerInput.name}"][value="${drawerInput.value}"]`);
            if (originalInput) {
              originalInput.checked = drawerInput.checked;
            }
          });

          const drawerRadios = drawerBody.querySelectorAll('input[type="radio"]');
          drawerRadios.forEach(drawerInput => {
            const originalInput = desktopGroupsContainer.querySelector(`input[name="${drawerInput.name}"][value="${drawerInput.value}"]`);
            if (originalInput) {
              originalInput.checked = drawerInput.checked;
            }
          });

          const drawerNumbers = drawerBody.querySelectorAll('input[type="number"][name]');
          drawerNumbers.forEach(drawerInput => {
            const originalInput = desktopGroupsContainer.querySelector(`input[name="${escAttr(drawerInput.name)}"]`);
            if (originalInput) {
              originalInput.value = drawerInput.value;
            }
          });
          form.submit();
        });
      }

      initPriceRanges(scope, true);
    }

    function initLoadMore(scope) {
      const loadMoreBtn = scope.querySelector('[data-load-more]');
      const grid = scope.querySelector('.snc-search-results__grid');
      if (!loadMoreBtn || !grid) return;

      const label = (loadMoreBtn.dataset.label || loadMoreBtn.textContent || '').trim();
      if (label) loadMoreBtn.dataset.label = label;

      const setLoading = (isLoading) => {
        loadMoreBtn.classList.toggle('is-loading', isLoading);
        loadMoreBtn.disabled = isLoading;
        if (label) loadMoreBtn.textContent = isLoading ? 'Loading...' : label;
      };

      on(loadMoreBtn, 'click', () => {
        const nextUrl = loadMoreBtn.dataset.nextUrl;
        if (!nextUrl || loadMoreBtn.dataset.loading === 'true') return;

        loadMoreBtn.dataset.loading = 'true';
        setLoading(true);

        fetch(nextUrl)
          .then(response => response.text())
          .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const nextGrid = doc.querySelector('.snc-search-results__grid');
            if (!nextGrid) throw new Error('Grid not found');

            const newItems = Array.from(nextGrid.children);
            newItems.forEach(item => grid.appendChild(item));

            attachProductCardListeners(grid);
            initWishlist(grid);

            const nextBtn = doc.querySelector('[data-load-more]');
            const newNextUrl = nextBtn ? nextBtn.dataset.nextUrl : '';
            if (newNextUrl) {
              loadMoreBtn.dataset.nextUrl = newNextUrl;
              loadMoreBtn.dataset.loading = 'false';
              setLoading(false);
            } else {
              const wrapper = loadMoreBtn.closest('.snc-load-more');
              if (wrapper) {
                wrapper.remove();
              } else {
                loadMoreBtn.remove();
              }
            }
          })
          .catch(() => {
            loadMoreBtn.dataset.loading = 'false';
            setLoading(false);
          });
      });
    }

    if (!globals.filtersInitialized) {
      globals.filtersInitialized = true;
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.snc-filter-group')) {
          document.querySelectorAll('.snc-filter-group[open]').forEach(el => el.removeAttribute('open'));
        }
      });

      const isDesignMode = window.Shopify && Shopify.designMode;
      if (!isDesignMode) {
        window.addEventListener('scroll', () => {
          document.querySelectorAll('.snc-filter-group[open]').forEach(el => el.removeAttribute('open'));
        }, { passive: true });
      }
    }

    attachProductCardListeners(section);
    initWishlist(section);
    initFilters(section);
    initLoadMore(section);
  }

  api.register('snc-plp', (section) => {
    const tracker = makeTracker();
    initProductListSection(section, tracker);
    return { cleanup: tracker.cleanup };
  });

  api.register('snc-search-results', (section) => {
    const tracker = makeTracker();
    initProductListSection(section, tracker);
    return { cleanup: tracker.cleanup };
  });

  api.register('snc-wishlist', (section) => {
    const { on, cleanup } = makeTracker();
    const grid = section.querySelector('[data-wishlist-grid]');
    const tabsContainer = section.querySelector('[data-wishlist-tabs]');
    const emptyMessage = section.querySelector('[data-wishlist-empty]');
    const plusIconUrl = section.dataset.plusIconUrl || '';
    const cardStyle = section.dataset.cardStyle || 'overlay';
    const showQaTitle = section.dataset.qaShowTitle === 'true';
    if (!grid) return { cleanup };

    function buildTabs(collections) {
      if (!tabsContainer) return;
      tabsContainer.innerHTML = '';

      const allTab = document.createElement('button');
      allTab.className = 'snc-wishlist--tab is-active';
      allTab.dataset.filter = 'all';
      allTab.textContent = 'Todos';
      tabsContainer.appendChild(allTab);

      collections.forEach(col => {
        const btn = document.createElement('button');
        btn.className = 'snc-wishlist--tab';
        btn.dataset.filter = col;
        btn.textContent = col;
        tabsContainer.appendChild(btn);
      });

      tabsContainer.style.display = 'flex';
      handleTabs();
    }

    function attachProductCardListeners(scope) {
      const productCards = scope.querySelectorAll('.snc-plp--product-card');
      const checkSVG = '<svg class="snc-plp--check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

      scope.querySelectorAll('.snc-plp--add-container').forEach(function(containerEl) {
        containerEl.addEventListener('click', function(e) {
          e.preventDefault();
        }, { capture: false });
      });

      function showAddedFeedback(card) {
        try {
          const button = card.querySelector('.snc-plp--add-button');
          const sizesInline = card.querySelector('.snc-plp--sizes-inline');
          const addContainer = card.querySelector('.snc-plp--add-container');

          if (sizesInline) {
            sizesInline.style.maxWidth = '0';
            sizesInline.style.padding = '0';
            sizesInline.style.opacity = '0';
          }

          if (button) {
            const plusIcon = button.querySelector('.snc-plp--plus-icon');
            if (plusIcon) plusIcon.style.display = 'none';
            button.insertAdjacentHTML('beforeend', checkSVG);
            button.style.backgroundColor = '#0d0d0d';
          }

          if (addContainer) addContainer.classList.add('is-success');

          setTimeout(() => {
            try {
              if (button) {
                const checkIcon = button.querySelector('.snc-plp--check-icon');
                if (checkIcon) checkIcon.remove();
                const plusIcon = button.querySelector('.snc-plp--plus-icon');
                if (plusIcon) plusIcon.style.display = '';
                button.style.backgroundColor = '';
              }
              if (sizesInline) {
                sizesInline.style.maxWidth = '';
                sizesInline.style.padding = '';
                sizesInline.style.opacity = '';
              }
              if (addContainer) addContainer.classList.remove('is-success');
            } catch (e) {}
          }, 2000);
        } catch (error) {}
      }

      function addToCart(variantId, card, buttonEl) {
        if (!variantId) return;
        const numericVariantId = parseInt(variantId, 10);
        if (isNaN(numericVariantId)) return;

        if (buttonEl) {
          buttonEl.disabled = true;
          buttonEl.style.opacity = '0.5';
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/cart/add.js', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
          showAddedFeedback(card);
          setTimeout(() => updateCartCount(), 300);
          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.style.opacity = '';
          }
        };

        xhr.onerror = function() {
          showAddedFeedback(card);
          if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.style.opacity = '';
          }
        };

        xhr.send(JSON.stringify({ items: [{ id: numericVariantId, quantity: 1 }] }));
      }

      productCards.forEach(function(card) {
        const addButton = card.querySelector('.snc-plp--add-button');
        const sizeOptions = card.querySelectorAll('.snc-plp--size-option');

        if (sizeOptions.length > 0) {
          sizeOptions.forEach(function(option) {
            option.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              if (this.disabled) return false;
              addToCart(this.getAttribute('data-variant-id'), card, this);
              return false;
            };
          });
          if (addButton) {
            addButton.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            };
          }
        } else if (addButton) {
          card.classList.add('snc-plp--single-variant');
          addButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productHandle = card.dataset.productHandle;
            if (!productHandle) return false;
            fetch('/products/' + productHandle + '.js')
              .then(response => response.json())
              .then(productData => {
                const variant = productData.variants.find(v => v.available) || productData.variants[0];
                if (variant) addToCart(variant.id, card, addButton);
              });
            return false;
          };
        }
      });

      const qaOverlays = scope.querySelectorAll('.snc-plp--quick-add-overlay');
      qaOverlays.forEach(overlay => {
        const sizeStep = overlay.querySelector('[data-step="size"]');
        const colorStep = overlay.querySelector('[data-step="color"]');
        const variantsScript = overlay.querySelector('.snc-plp--variant-data');
        const fullBtn = overlay.querySelector('.snc-plp--qa-btn-full');

        if (sizeStep && colorStep && variantsScript) {
          const variants = JSON.parse(variantsScript.textContent);

          const sizeBtns = sizeStep.querySelectorAll('.snc-plp--qa-option');
          sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (btn.disabled) return;

              const sizeVal = btn.dataset.value;
              overlay.dataset.selectedSize = sizeVal;

              const colorBtns = colorStep.querySelectorAll('.snc-plp--qa-option');
              colorBtns.forEach(colorBtn => {
                const colorVal = colorBtn.dataset.value;
                const variant = variants.find(v => {
                  const opts = [v.option1, v.option2, v.option3];
                  return opts.includes(sizeVal) && opts.includes(colorVal);
                });

                colorBtn.disabled = !(variant && variant.available);
              });

              sizeStep.style.opacity = '0';
              setTimeout(() => {
                sizeStep.style.display = 'none';
                colorStep.style.display = 'block';
                void colorStep.offsetWidth;
                colorStep.style.opacity = '1';
              }, 200);
            });
          });

          const colorBtns = colorStep.querySelectorAll('.snc-plp--qa-option');
          colorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (btn.disabled) return;

              const colorVal = btn.dataset.value;
              const sizeVal = overlay.dataset.selectedSize;

              const variant = variants.find(v => {
                const opts = [v.option1, v.option2, v.option3];
                return opts.includes(sizeVal) && opts.includes(colorVal);
              });

              if (variant) {
                addToCart(variant.id, overlay.closest('.snc-plp--product-card'), btn);
                setTimeout(() => {
                  colorStep.style.opacity = '0';
                  setTimeout(() => {
                    colorStep.style.display = 'none';
                    sizeStep.style.display = 'block';
                    sizeStep.style.opacity = '1';
                    delete overlay.dataset.selectedSize;
                  }, 200);
                }, 2000);
              }
            });
          });
        }
        else if (sizeStep) {
          const sizeBtns = sizeStep.querySelectorAll('.snc-plp--qa-option');
          sizeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
              if (btn.disabled) return;
              e.preventDefault();
              e.stopPropagation();
              const variantId = btn.dataset.variantId;
              addToCart(variantId, overlay.closest('.snc-plp--product-card'), btn);
            });
          });
        }
        else if (fullBtn) {
          fullBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const handle = fullBtn.dataset.addProductHandle;
            if (!handle) return;

            fetch('/products/' + handle + '.js')
              .then(response => response.json())
              .then(productData => {
                const variant = productData.variants.find(v => v.available) || productData.variants[0];
                if (variant) {
                  addToCart(variant.id, overlay.closest('.snc-plp--product-card'), fullBtn);
                }
              });
          });
        }
      });
    }

    function handleRemove() {
      document.querySelectorAll('[data-wishlist-remove]').forEach(btn => {
        on(btn, 'click', function() {
          const handle = btn.dataset.wishlistRemove;
          const favs = getFavorites();
          const newFavorites = favs.filter(h => h !== handle);
          saveFavorites(newFavorites);
          renderWishlist();
        });
      });
    }

    function handleTabs() {
      if (!tabsContainer) return;
      const tabs = tabsContainer.querySelectorAll('.snc-wishlist--tab');
      tabs.forEach(tab => {
        on(tab, 'click', () => {
          tabs.forEach(t => t.classList.remove('is-active'));
          tab.classList.add('is-active');

          const filter = tab.dataset.filter;
          const cards = grid.querySelectorAll('.snc-plp--product-card');
          const shownHandles = new Set();

          cards.forEach(card => {
            const handle = card.dataset.productHandle;
            const matchesFilter = filter === 'all' || card.dataset.collection === filter;
            if (matchesFilter) {
              card.style.display = 'block';
              shownHandles.add(handle);
            } else {
              card.style.display = 'none';
            }
          });
        });
      });
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function getOptionValues(index, variants) {
      if (index < 0) return [];
      const key = 'option' + (index + 1);
      const values = [];
      variants.forEach(variant => {
        const val = variant[key];
        if (val && !values.includes(val)) values.push(val);
      });
      return values;
    }

    async function renderWishlist() {
      const favorites = getFavorites();

      if (favorites.length === 0) {
        emptyMessage.style.display = 'block';
        grid.style.display = 'none';
        if (tabsContainer) tabsContainer.style.display = 'none';
        return;
      }

      grid.innerHTML = '';
      grid.innerHTML = '<div class="snc-plp--loader"><div class="snc-plp--spinner"></div><p>Loading your wishlist...</p></div>';

      if (favorites.length > 0) {
        try {
          const requests = favorites.map(handle =>
            fetch(`/products/${handle}.js`)
              .then(res => {
                if (!res.ok) return null;
                return res.json();
              })
              .catch(() => null)
          );

          const items = await Promise.all(requests);

          grid.innerHTML = '';

          let visibleCount = 0;
          const collections = new Set();

          items.forEach(product => {
            if (!product) return;

            const productCollections = product.collections || [];
            productCollections.forEach(col => collections.add(col.title));

            const variants = product.variants || [];
            const options = product.options || [];
            const mainImage = product.featured_image || (product.images && product.images[0]) || '';
            const hoverImage = (product.images || []).find(img => img && img !== mainImage) || '';
            const price = formatMoney(product.price);
            const comparePrice = (product.compare_at_price && product.compare_at_price > product.price) ? formatMoney(product.compare_at_price) : '';
            const optionNames = options.map(opt => {
              if (typeof opt === 'string') return opt.toLowerCase().trim();
              return String(opt.name || '').toLowerCase().trim();
            });
            const sizeIndex = optionNames.findIndex(name => name === 'talla' || name === 'size' || name === 'tamaño');
            const colorIndex = optionNames.findIndex(name => name === 'color' || name === 'colour' || name === 'colores');
            const sizeValues = sizeIndex >= 0 ? getOptionValues(sizeIndex, variants) : [];
            const colorValues = colorIndex >= 0 ? getOptionValues(colorIndex, variants) : [];

            let sizesDropdownHtml = '';
            if (sizeValues.length > 0) {
              const sizeButtons = sizeValues.map(value => {
                const variantForSize = variants.find(variant => {
                  const opts = [variant.option1, variant.option2, variant.option3];
                  return opts.includes(value);
                });
                const isAvailable = variantForSize ? variantForSize.available : false;
                const variantId = variantForSize ? variantForSize.id : '';
                return `<button class="snc-plp--size-option" data-variant-id="${variantId}" ${isAvailable ? '' : 'disabled'}>${escapeHtml(value)}</button>`;
              }).join('');
              sizesDropdownHtml = `<div class="snc-plp--sizes-dropdown">${sizeButtons}</div>`;
            }

            let qaOverlayHtml = '';
            if (cardStyle === 'below') {
              if (sizeIndex >= 0 && colorIndex >= 0) {
                const sizeButtons = sizeValues.map(value => {
                  const isAvailable = variants.some(variant => {
                    const opts = [variant.option1, variant.option2, variant.option3];
                    return opts.includes(value) && variant.available;
                  });
                  return `<button type="button" class="snc-plp--qa-option" data-value="${escapeHtml(value)}" ${isAvailable ? '' : 'disabled'}>${escapeHtml(value)}</button>`;
                }).join('');
                const colorButtons = colorValues.map(value => (
                  `<button type="button" class="snc-plp--qa-option" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`
                )).join('');
                const variantsJson = JSON.stringify(variants).replace(/</g, '\\u003c');
                qaOverlayHtml = `
                  <div class="snc-plp--quick-add-overlay">
                    <div class="snc-plp--qa-step" data-step="size">
                      ${showQaTitle ? '<span class="snc-plp--qa-title">Selecciona Talla</span>' : ''}
                      <div class="snc-plp--qa-options">${sizeButtons}</div>
                    </div>
                    <div class="snc-plp--qa-step" data-step="color" style="display: none; opacity: 0;">
                      ${showQaTitle ? '<span class="snc-plp--qa-title">Selecciona Color</span>' : ''}
                      <div class="snc-plp--qa-options">${colorButtons}</div>
                    </div>
                    <script type="application/json" class="snc-plp--variant-data">${variantsJson}<\/script>
                  </div>
                `;
              } else if (sizeIndex >= 0 || colorIndex >= 0) {
                const optionIndex = sizeIndex >= 0 ? sizeIndex : colorIndex;
                const optionValues = getOptionValues(optionIndex, variants);
                const label = sizeIndex >= 0 ? 'Selecciona Talla' : 'Selecciona Color';
                const optionButtons = optionValues.map(value => {
                  const variantForValue = variants.find(variant => {
                    const opts = [variant.option1, variant.option2, variant.option3];
                    return opts.includes(value);
                  });
                  const isAvailable = variantForValue ? variantForValue.available : false;
                  const variantId = variantForValue ? variantForValue.id : '';
                  return `<button type="button" class="snc-plp--qa-option" data-variant-id="${variantId}" ${isAvailable ? '' : 'disabled'}>${escapeHtml(value)}</button>`;
                }).join('');
                qaOverlayHtml = `
                  <div class="snc-plp--quick-add-overlay">
                    <div class="snc-plp--qa-step" data-step="size">
                      ${showQaTitle ? `<span class="snc-plp--qa-title">${label}</span>` : ''}
                      <div class="snc-plp--qa-options">${optionButtons}</div>
                    </div>
                  </div>
                `;
              } else {
                qaOverlayHtml = `
                  <div class="snc-plp--quick-add-overlay">
                    <button type="button" class="snc-plp--qa-btn-full" data-add-product-handle="${escapeHtml(product.handle)}">Agregar al carrito</button>
                  </div>
                `;
              }
            }

            const card = document.createElement('div');
            card.className = 'snc-plp--product-card snc-wishlist--card-wrapper';
            card.dataset.productHandle = product.handle;
            card.dataset.collection = (product.collections && product.collections[0] && product.collections[0].title) || '';
            card.dataset.cardStyle = cardStyle;
            card.innerHTML = `
              <button class="snc-wishlist--remove-button" type="button" aria-label="Eliminar" data-wishlist-remove="${escapeHtml(product.handle)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div class="snc-plp--product-image-wrapper">
                <a href="${product.url}" class="snc-plp--product-image-link">
                  <img src="${mainImage}" alt="${escapeHtml(product.title)}" class="snc-plp--product-main-image" loading="lazy">
                  ${hoverImage ? `<img src="${hoverImage}" alt="${escapeHtml(product.title)}" class="snc-plp--product-hover-image" loading="lazy">` : ''}
                </a>
                ${qaOverlayHtml}
              </div>
              <div class="snc-plp--product-footer">
                <div class="snc-plp--product-info">
                  <a href="${product.url}" class="snc-plp--product-title-link">
                    <h3 class="snc-plp--product-title">${escapeHtml(product.title)}</h3>
                  </a>
                  <div class="snc-plp--product-price-container">
                    ${comparePrice ? `<span class="snc-plp--product-compare-price">${comparePrice}</span>` : ''}
                    <span class="snc-plp--product-price">${price}</span>
                  </div>
                </div>
                <div class="snc-plp--add-container">
                  ${sizesDropdownHtml}
                  <div class="snc-plp--sizes-inline"></div>
                  <button class="snc-plp--add-button">
                    <img src="${plusIconUrl}" alt="Add to cart" class="snc-plp--plus-icon">
                  </button>
                </div>
              </div>
            `;

            grid.appendChild(card);
            visibleCount += 1;
          });

          if (visibleCount === 0) {
            emptyMessage.style.display = 'block';
            grid.style.display = 'none';
            if (tabsContainer) tabsContainer.style.display = 'none';
            return;
          }

          grid.style.display = 'grid';
          emptyMessage.style.display = 'none';

          if (collections.size > 1) {
            buildTabs(Array.from(collections));
          } else if (tabsContainer) {
            tabsContainer.style.display = 'none';
          }

          attachProductCardListeners(section);
          handleRemove();
          handleTabs();
        } catch (error) {
          grid.innerHTML = '<p>Error al cargar favoritos.</p>';
        }
      }
    }

    renderWishlist();
    handleRemove();
    handleTabs();

    on(window, 'storage', e => {
      if (e.key === FAVORITES_KEY) renderWishlist();
    });

    return { cleanup };
  });

  api.register('snc-collection-carousel', (section) => {
    const { on, cleanup } = makeTracker();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(section);

    const parallaxBoxes = section.querySelectorAll('.snc-cc__parallax-box');
    if (parallaxBoxes.length > 0) {
      const isDesignMode = window.Shopify && Shopify.designMode;
      if (!isDesignMode) {
        const handleParallax = () => {
          parallaxBoxes.forEach(box => {
            const rect = box.parentElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (rect.top < windowHeight && rect.bottom > 0) {
              const speed = -0.08;
              const offset = (rect.top - (windowHeight / 2)) * speed;
              box.style.transform = `translateY(${offset}px)`;
            }
          });
        };
        on(window, 'scroll', () => requestAnimationFrame(handleParallax), { passive: true });
        handleParallax();
      }
    }

    const track = section.querySelector('.snc-cc__track');
    const prevBtn = section.querySelector('[data-prev]');
    const nextBtn = section.querySelector('[data-next]');

    if (track && prevBtn && nextBtn) {
      const scrollAmount = () => {
        const slide = track.querySelector('.snc-cc__slide');
        if (!slide) return 0;
        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap || 0);
        return slide.offsetWidth + gap;
      };

      on(prevBtn, 'click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
      on(nextBtn, 'click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
    }

    return {
      cleanup: () => {
        observer.disconnect();
        cleanup();
      }
    };
  });

  api.register('snc-collection-list', (section) => {
    const { on, cleanup } = makeTracker();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(section);

    const parallaxBoxes = section.querySelectorAll('.snc-cl__parallax-box');
    if (parallaxBoxes.length > 0) {
      const isDesignMode = window.Shopify && Shopify.designMode;
      if (!isDesignMode) {
        const handleParallax = () => {
          parallaxBoxes.forEach(box => {
            const rect = box.parentElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (rect.top < windowHeight && rect.bottom > 0) {
              const speed = -0.08;
              const offset = (rect.top - (windowHeight / 2)) * speed;
              box.style.transform = `translateY(${offset}px)`;
            }
          });
        };
        on(window, 'scroll', () => requestAnimationFrame(handleParallax), { passive: true });
        handleParallax();
      }
    }

    return {
      cleanup: () => {
        observer.disconnect();
        cleanup();
      }
    };
  });

  api.register('snc-video-carousel', (section) => {
    const { on, cleanup } = makeTracker();
    const ensureSwiper = () => {
      if (window.Swiper) return Promise.resolve();
      if (window.__sncSwiperPromise) return window.__sncSwiperPromise;

      const cssHref = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
      const jsSrc = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';

      window.__sncSwiperPromise = new Promise((resolve, reject) => {
        if (!document.querySelector(`link[href="${cssHref}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = cssHref;
          document.head.appendChild(link);
        }

        const existingScript = document.querySelector(`script[src="${jsSrc}"]`);
        if (existingScript) {
          if (window.Swiper) return resolve();
          existingScript.addEventListener('load', () => resolve(), { once: true });
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Swiper')), { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = jsSrc;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Swiper'));
        document.head.appendChild(script);
      });

      return window.__sncSwiperPromise;
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    observer.observe(section);

    const parallaxBoxes = section.querySelectorAll('.snc-vc__parallax-box');
    if (parallaxBoxes.length > 0) {
      const isDesignMode = window.Shopify && Shopify.designMode;
      if (!isDesignMode) {
        const handleParallax = () => {
          parallaxBoxes.forEach(box => {
            const rect = box.parentElement.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            if (rect.top < windowHeight && rect.bottom > 0) {
              const speed = -0.08;
              const offset = (rect.top - (windowHeight / 2)) * speed;
              box.style.transform = `translateY(${offset}px)`;
            }
          });
        };
        on(window, 'scroll', () => requestAnimationFrame(handleParallax), { passive: true });
        handleParallax();
      }
    }

    const track = section.querySelector('.snc-vc__track');
    const prevBtn = section.querySelector('[data-prev]');
    const nextBtn = section.querySelector('[data-next]');

    if (track && prevBtn && nextBtn) {
      const scrollAmount = () => {
        const slide = track.querySelector('.snc-vc__slide');
        if (!slide) return 0;
        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap || 0);
        return slide.offsetWidth + gap;
      };

      on(prevBtn, 'click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
      on(nextBtn, 'click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
    }

    const drawerOverlay = section.querySelector('[data-drawer-overlay]');
    const drawerPanel = section.querySelector('[data-drawer-panel]');
    const drawerContent = section.querySelector('[data-drawer-content]');
    const drawerClose = section.querySelector('[data-drawer-close]');
    const productTriggers = section.querySelectorAll('[data-open-product]');

    let scrollY = 0;

    const openDrawer = () => {
      scrollY = window.scrollY;
      drawerOverlay.classList.add('is-open');
      drawerPanel.classList.add('is-open');

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';

      if (window.lenis) window.lenis.stop();
    };

    const closeDrawer = () => {
      drawerOverlay.classList.remove('is-open');
      drawerPanel.classList.remove('is-open');

      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      window.scrollTo(0, scrollY);

      if (window.lenis) window.lenis.start();

      setTimeout(() => {
        drawerContent.innerHTML = '';
      }, 300);
    };

    if (drawerClose) on(drawerClose, 'click', closeDrawer);
    if (drawerOverlay) on(drawerOverlay, 'click', closeDrawer);

    productTriggers.forEach(btn => {
      on(btn, 'click', (e) => {
        e.preventDefault();
        const handle = btn.dataset.openProduct;
        const videoUrl = btn.dataset.videoUrl;
        if (!handle) return;

        openDrawer();
        drawerContent.innerHTML = '<div class="snc-vc--drawer-loader"></div>';

        fetch(`/products/${handle}`)
          .then(res => res.text())
          .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const productSection = doc.querySelector('.section--pdp-hero');

            if (!productSection) throw new Error('Section not found');

            let content = productSection.innerHTML;

            const idMatch = content.match(/data-section-id="([^"]+)"/);
            if (idMatch) {
              const oldId = idMatch[1];
              const newId = oldId + '-drawer-' + Math.floor(Math.random() * 10000);
              content = content.replace(new RegExp(oldId, 'g'), newId);
            }

            if (videoUrl) {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = content;
              const wrapper = tempDiv.querySelector('.pdp-hero--wrapper');
              const imageWrapper = tempDiv.querySelector('.pdp-hero--image-wrapper');

              if (wrapper) {
                wrapper.classList.add('has-drawer-video');

                const videoDivDesktop = document.createElement('div');
                videoDivDesktop.className = 'snc-vc--drawer-video-container desktop-only';
                videoDivDesktop.innerHTML = `<video src="${videoUrl}" autoplay loop muted playsinline></video>`;
                wrapper.insertBefore(videoDivDesktop, wrapper.firstChild);

                if (imageWrapper) {
                  const videoDivMobile = document.createElement('div');
                  videoDivMobile.className = 'snc-vc--drawer-video-mobile mobile-only';
                  videoDivMobile.innerHTML = `<video src="${videoUrl}" autoplay loop muted playsinline></video>`;
                  imageWrapper.insertBefore(videoDivMobile, imageWrapper.firstChild);
                }

                content = tempDiv.innerHTML;
              }
            }

            drawerContent.innerHTML = content;
            const scripts = drawerContent.querySelectorAll('script');
            scripts.forEach(oldScript => {
              const newScript = document.createElement('script');
              Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
              newScript.appendChild(document.createTextNode(oldScript.innerHTML));
              oldScript.parentNode.replaceChild(newScript, oldScript);
            });

            const initSections = () => {
              if (window.SncSections && typeof window.SncSections.initAll === 'function') {
                window.SncSections.initAll(drawerContent);
              }
            };

            if (drawerContent.querySelector('[data-reviews-swiper]') && !window.Swiper) {
              ensureSwiper().then(initSections).catch(initSections);
            } else {
              initSections();
            }
          })
          .catch(err => {
            console.error(err);
            drawerContent.innerHTML = '<p style="text-align:center; padding: 20px;">Error al cargar el producto.</p>';
          });
      });
    });

    return {
      cleanup: () => {
        observer.disconnect();
        cleanup();
      }
    };
  });

  api.register('snc-influencer-carousel', (section) => {
    const { on, cleanup } = makeTracker();
    const track = section.querySelector('.snc-ic__track');
    const prevBtn = section.querySelector('[data-prev]');
    const nextBtn = section.querySelector('[data-next]');

    if (track && prevBtn && nextBtn) {
      const scrollAmount = () => {
        const slide = track.querySelector('.snc-ic__slide');
        if (!slide) return 0;
        const style = window.getComputedStyle(track);
        const gap = parseFloat(style.gap || 0);
        return slide.offsetWidth + gap;
      };

      on(prevBtn, 'click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
      on(nextBtn, 'click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
    }

    return { cleanup };
  });

  api.register('snc-footer', (section) => {
    const { on, cleanup } = makeTracker();
    const mobileBreakpoint = 900;
    const columns = section.querySelectorAll('.snc-footer--menu-column[data-mobile-collapse]');
    if (!columns.length) return { cleanup };

    const applyState = () => {
      const isMobile = window.innerWidth <= mobileBreakpoint;
      columns.forEach(column => {
        const button = column.querySelector('.snc-footer--menu-title-btn');
        const menu = column.querySelector('.snc-footer--menu-links');
        if (!button || !menu) return;

        if (!isMobile) {
          column.classList.remove('is-collapsed', 'is-open');
          button.setAttribute('aria-expanded', 'true');
          menu.setAttribute('aria-hidden', 'false');
        } else {
          const isOpen = column.classList.contains('is-open');
          column.classList.toggle('is-collapsed', !isOpen);
          button.setAttribute('aria-expanded', String(isOpen));
          menu.setAttribute('aria-hidden', String(!isOpen));
        }
      });
    };

    const toggleColumn = (column) => {
      const button = column.querySelector('.snc-footer--menu-title-btn');
      const menu = column.querySelector('.snc-footer--menu-links');
      if (!button || !menu) return;

      const isOpen = column.classList.toggle('is-open');
      column.classList.toggle('is-collapsed', !isOpen);
      button.setAttribute('aria-expanded', String(isOpen));
      menu.setAttribute('aria-hidden', String(!isOpen));
    };

    columns.forEach(column => {
      const button = column.querySelector('.snc-footer--menu-title-btn');
      if (!button) return;

      on(button, 'click', (event) => {
        if (window.innerWidth > mobileBreakpoint) return;
        event.preventDefault();
        toggleColumn(column);
      });
    });

    applyState();
    on(window, 'resize', applyState);

    return { cleanup };
  });

  api.register('snc-faq', (section) => {
    const { on, cleanup } = makeTracker();
    const details = section.querySelectorAll('.snc-faq-item');

    details.forEach(targetDetail => {
      on(targetDetail, 'click', (e) => {
        if (e.target.closest('summary')) {
          details.forEach(detail => {
            if (detail !== targetDetail) {
              detail.removeAttribute('open');
            }
          });
        }
      });
    });

    return { cleanup };
  });

  api.register('snc-help-center', (section) => {
    const { on, cleanup } = makeTracker();
    const triggers = section.querySelectorAll('[data-tab-trigger]');
    const cards = section.querySelectorAll('[data-tab-content]');

    triggers.forEach(trigger => {
      on(trigger, 'click', () => {
        triggers.forEach(t => t.classList.remove('is-active'));
        trigger.classList.add('is-active');

        const selectedTab = trigger.dataset.tabTrigger;

        cards.forEach(card => {
          if (card.dataset.tabContent === selectedTab) {
            card.removeAttribute('hidden');
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
            requestAnimationFrame(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            });
          } else {
            card.setAttribute('hidden', '');
          }
        });
      });
    });

    return { cleanup };
  });

  api.register('snc-main-login', (section) => {
    const { cleanup } = makeTracker();
    if (window.location.hash === '#recover') {
      const loginForm = section.querySelector('#login-form');
      const recoverForm = section.querySelector('#recover-form');
      if (loginForm && recoverForm) {
        loginForm.style.display = 'none';
        recoverForm.style.display = 'block';
      }
    }
    return { cleanup };
  });

  api.register('snc-pdp-hero', (heroRoot) => {
    const { on, setIntervalTracked, setTimeoutTracked, cleanup } = makeTracker();
    const sectionId = heroRoot.dataset.sectionId;
    const variantsDataEl = heroRoot.querySelector('#product-variants-json-' + sectionId) || document.getElementById('product-variants-json-' + sectionId);
    const variantsData = variantsDataEl ? JSON.parse(variantsDataEl.textContent) : { variants: [], media: [] };
    const productImage = heroRoot.dataset.productImage || '';

    const toggleButton = heroRoot.querySelector('[data-toggle-hero]');
    const sizeButtons = heroRoot.querySelectorAll('.pdp-hero--size-button');
    const colorButtons = heroRoot.querySelectorAll('.pdp-hero--color-button');
    const addToCartButton = heroRoot.querySelector('[data-add-to-cart]');
    const buyNowButton = heroRoot.querySelector('[data-buy-now]');
    const accordions = heroRoot.querySelectorAll('[data-accordion]');
    const heroButtonsContainer = heroRoot.querySelector('.pdp-hero--buttons-container');
    let selectedVariantId = parseInt(heroRoot.dataset.initialVariantId || '0', 10);
    let selectedSize = null;
    let selectedColor = null;

    if (!selectedVariantId && variantsData.variants.length > 0) {
      selectedVariantId = variantsData.variants[0].id;
    }

    const initialVariant = variantsData.variants.find(v => v.id === selectedVariantId);
    if (initialVariant) {
      document.dispatchEvent(new CustomEvent('snc:variant:change', {
        detail: { variant: initialVariant, productImage: productImage }
      }));
    }

    const defaultSizeButton = heroRoot.querySelector('.pdp-hero--size-button.is-selected');
    if (defaultSizeButton) {
      selectedSize = defaultSizeButton.dataset.sizeValue;
    }
    const defaultColorButton = heroRoot.querySelector('.pdp-hero--color-button.is-selected');
    if (defaultColorButton) {
      selectedColor = defaultColorButton.dataset.colorValue;
    }

    if (toggleButton) {
      on(toggleButton, 'click', function() {
        heroRoot.classList.toggle('is-minimized');
        const isMinimized = heroRoot.classList.contains('is-minimized');
        try {
          localStorage.setItem('pdp-hero-minimized', isMinimized ? 'true' : 'false');
        } catch (e) {}
      });
    }

    try {
      const savedState = localStorage.getItem('pdp-hero-minimized');
      if (savedState === 'true') {
        heroRoot.classList.add('is-minimized');
      }
    } catch (e) {}

    function findVariantByOptions(sizeValue, colorValue) {
      if (sizeValue && colorValue) {
        return variantsData.variants.find(variant => {
          const hasSize = variant.option1 === sizeValue || variant.option2 === sizeValue || variant.option3 === sizeValue;
          const hasColor = variant.option1 === colorValue || variant.option2 === colorValue || variant.option3 === colorValue;
          return hasSize && hasColor;
        });
      }
      if (sizeValue) {
        return variantsData.variants.find(variant => {
          return variant.option1 === sizeValue || variant.option2 === sizeValue || variant.option3 === sizeValue;
        });
      }
      if (colorValue) {
        return variantsData.variants.find(variant => {
          return variant.option1 === colorValue || variant.option2 === colorValue || variant.option3 === colorValue;
        });
      }
      return variantsData.variants.find(v => v.id === selectedVariantId);
    }

    sizeButtons.forEach(button => {
      on(button, 'click', function() {
        if (this.disabled) return;
        sizeButtons.forEach(btn => btn.classList.remove('is-selected'));
        this.classList.add('is-selected');
        selectedSize = this.dataset.sizeValue;

        const matchedVariant = findVariantByOptions(selectedSize, selectedColor);
        if (matchedVariant) {
          selectedVariantId = matchedVariant.id;
          updateVariantSelection(matchedVariant);
        }
      });
    });

    colorButtons.forEach(button => {
      on(button, 'click', function() {
        if (this.disabled) return;
        colorButtons.forEach(btn => btn.classList.remove('is-selected'));
        this.classList.add('is-selected');
        selectedColor = this.dataset.colorValue;

        const matchedVariant = findVariantByOptions(selectedSize, selectedColor);
        if (matchedVariant) {
          selectedVariantId = matchedVariant.id;
          updateVariantSelection(matchedVariant);
        }
      });
    });

    function updateVariantSelection(variant) {
      if (!variant) {
        variant = variantsData.variants.find(v => v.id === selectedVariantId);
      }

      if (!variant) return;

      if (addToCartButton) {
        addToCartButton.disabled = !variant.available;
      }
      if (buyNowButton) {
        buyNowButton.disabled = !variant.available;
      }

      const stockStatusEl = heroRoot.querySelector('[data-stock-status]');
      const stockNotifyEl = heroRoot.querySelector('[data-stock-notify]');
      const stockSuccessEl = heroRoot.querySelector('[data-stock-success]');
      const stockContentEl = heroRoot.querySelector('[data-stock-content]');

      if (stockStatusEl) {
        stockStatusEl.className = 'pdp-hero--stock-status';
        const inStockLabel = stockStatusEl.dataset.inStockLabel || 'En stock';
        const lowStockTemplate = stockStatusEl.dataset.lowStockTemplate || 'Quedan :count unidades';
        const outStockLabel = stockStatusEl.dataset.outStockLabel || 'Agotado';
        const lowStockThreshold = parseInt(stockStatusEl.dataset.lowStockThreshold || '10', 10);
        const isSimulated = stockStatusEl.hasAttribute('data-simulate-out-of-stock');
        let statusHtml = '';

        if (stockContentEl) {
          stockContentEl.style.display = 'block';
          stockContentEl.classList.remove('is-fading-out');
        }
        if (stockSuccessEl) stockSuccessEl.style.display = 'none';

        if (!variant.available || isSimulated) {
          stockStatusEl.classList.add('is-out-of-stock');
          statusHtml = `<span class="pdp-hero--stock-dot"></span><span>${outStockLabel}</span>`;
          if (stockNotifyEl) stockNotifyEl.style.display = 'block';
        } else if (variant.inventory_management === 'shopify' && variant.inventory_quantity > 0 && variant.inventory_quantity <= lowStockThreshold) {
          stockStatusEl.classList.add('is-low-stock');
          const lowText = lowStockTemplate.replace(':count', variant.inventory_quantity);
          statusHtml = `<span class="pdp-hero--stock-dot"></span><span>${lowText}</span>`;
          if (stockNotifyEl) stockNotifyEl.style.display = 'none';
        } else {
          stockStatusEl.classList.add('is-in-stock');
          statusHtml = `<span class="pdp-hero--stock-dot"></span><span>${inStockLabel}</span>`;
          if (stockNotifyEl) stockNotifyEl.style.display = 'none';
        }
        stockStatusEl.innerHTML = statusHtml;
      }

      document.dispatchEvent(new CustomEvent('snc:variant:change', {
        detail: { variant: variant, productImage: productImage }
      }));

      if (variant.featured_media_id) {
        const imageEl = heroRoot.querySelector(`.pdp-hero--main-image[data-media-id="${variant.featured_media_id}"]`);
        if (imageEl) {
          imageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    if (addToCartButton) {
      on(addToCartButton, 'click', function() {
        if (!selectedVariantId || this.disabled) return;

        this.disabled = true;
        this.style.opacity = '0.5';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/cart/add.js', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            if (typeof window.updateSideCart === 'function') {
              window.updateSideCart();
            }
            if (typeof updateCartCount === 'function') {
              updateCartCount();
            }
          }
          addToCartButton.disabled = false;
          addToCartButton.style.opacity = '';
        };

        xhr.onerror = function() {
          addToCartButton.disabled = false;
          addToCartButton.style.opacity = '';
        };

        xhr.send(JSON.stringify({ items: [{ id: selectedVariantId, quantity: 1 }] }));
      });
    }

    const notifyForm = heroRoot.querySelector('[data-notify-form]');
    if (notifyForm) {
      on(notifyForm, 'submit', function(e) {
        e.preventDefault();
        const stockContentEl = heroRoot.querySelector('[data-stock-content]');
        const stockSuccessEl = heroRoot.querySelector('[data-stock-success]');

        if (stockContentEl) {
          stockContentEl.classList.add('is-fading-out');

          stockContentEl.addEventListener('transitionend', function() {
            stockContentEl.style.display = 'none';
            if (stockSuccessEl) {
              stockSuccessEl.style.display = 'flex';
            }
          }, { once: true });
        }
      });
    }

    if (buyNowButton) {
      on(buyNowButton, 'click', function() {
        if (!selectedVariantId || this.disabled) return;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/cart/add.js', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            window.location.href = '/checkout';
          }
        };

        xhr.send(JSON.stringify({ items: [{ id: selectedVariantId, quantity: 1 }] }));
      });
    }

    accordions.forEach(accordion => {
      const button = accordion.querySelector('[data-accordion-toggle]');
      if (button) {
        on(button, 'click', function() {
          accordion.classList.toggle('is-open');
        });
      }
    });

    const deliveryElement = heroRoot.querySelector('[data-delivery-estimation]');
    if (deliveryElement) {
      const minDays = parseInt(deliveryElement.dataset.minDays) || 3;
      const maxDays = parseInt(deliveryElement.dataset.maxDays) || 6;
      const prefix = (deliveryElement.dataset.prefix || 'Recibe entre').trim();
      const suffix = (deliveryElement.dataset.suffix || 'días hábiles').trim();
      const countryText = (deliveryElement.dataset.country || '').trim();
      const fontSize = deliveryElement.dataset.fontSize;
      const fontWeight = deliveryElement.dataset.fontWeight;
      const color = deliveryElement.dataset.color;
      const letterSpacing = deliveryElement.dataset.letterSpacing;
      const wordGap = deliveryElement.dataset.wordGap;

      if (fontSize) deliveryElement.style.setProperty('--delivery-font-size', `${fontSize}px`);
      if (fontWeight) deliveryElement.style.setProperty('--delivery-font-weight', fontWeight);
      if (color) deliveryElement.style.setProperty('--delivery-text-color', color);
      if (letterSpacing !== undefined && letterSpacing !== '') deliveryElement.style.setProperty('--delivery-letter-spacing', `${letterSpacing}px`);
      if (wordGap !== undefined && wordGap !== '') deliveryElement.style.setProperty('--delivery-segment-gap', `${wordGap}px`);

      const today = new Date();

      const getDeliveryDate = (daysToAdd) => {
        const date = new Date(today);
        date.setDate(today.getDate() + daysToAdd);
        const month = date.toLocaleString('es-ES', { month: 'short' });
        const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
        return `${monthCap} ${date.getDate()}`;
      };

      const minDateStr = getDeliveryDate(minDays);
      const maxDateStr = getDeliveryDate(maxDays);

      const createSegment = (text) => {
        const span = document.createElement('span');
        span.textContent = text;
        return span;
      };

      const segments = [];
      if (prefix) segments.push(createSegment(prefix));
      segments.push(createSegment(`${minDateStr} - ${maxDateStr}`));
      if (suffix) segments.push(createSegment(suffix));
      if (countryText) segments.push(createSegment(countryText));

      deliveryElement.innerHTML = '';
      segments.forEach(segment => deliveryElement.appendChild(segment));
    }

    const reviewsSwiperEl = heroRoot.querySelector('[data-reviews-swiper]');
    const reviewsNextBtn = heroRoot.querySelector('[data-reviews-next]');
    const reviewsPrevBtn = heroRoot.querySelector('[data-reviews-prev]');
    let reviewsSwiper = null;

    if (reviewsSwiperEl && window.Swiper) {
      reviewsSwiper = new window.Swiper(reviewsSwiperEl, {
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 15,
        loop: false,
        autoHeight: true,
        watchOverflow: true,
        navigation: {
          nextEl: reviewsNextBtn,
          prevEl: reviewsPrevBtn
        }
      });
    }

    const toast = document.getElementById('pdp-hero-toast');
    let toastTimeout;

    function showToast(message) {
      if (!toast) return;
      const textEl = toast.querySelector('.pdp-hero--toast-text');
      if (textEl && message) textEl.textContent = message;

      toast.classList.add('is-visible');

      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeoutTracked(() => {
        toast.classList.remove('is-visible');
      }, 3000);
    }

    on(document, 'snc:show-toast', (event) => {
      showToast(event.detail.message || 'Agregado al carrito');
    });

    on(document, 'snc:sticky-variant:change', (event) => {
      const variant = event.detail.variant;
      if (!variant) return;

      selectedVariantId = variant.id;

      if (sizeButtons.length > 0) {
        const sizeOptionIndex = parseInt(sizeButtons[0].dataset.optionPosition) - 1;
        const sizeValue = variant.options[sizeOptionIndex];
        sizeButtons.forEach(btn => btn.classList.toggle('is-selected', btn.dataset.sizeValue === sizeValue));
        selectedSize = sizeValue;
      }

      if (colorButtons.length > 0) {
        const colorOptionIndex = parseInt(colorButtons[0].dataset.optionPosition) - 1;
        const colorValue = variant.options[colorOptionIndex];
        colorButtons.forEach(btn => btn.classList.toggle('is-selected', btn.dataset.colorValue === colorValue));
        selectedColor = colorValue;
      }

      updateVariantSelection(variant);
    });

    const quickAddButtons = heroRoot.querySelectorAll('[data-quick-add]');
    quickAddButtons.forEach(btn => {
      on(btn, 'click', function() {
        let variantId = this.dataset.quickAdd;

        const item = this.closest('.pdp-hero--complementary-item');
        if (item) {
          const select = item.querySelector('.pdp-hero--complementary-select');
          if (select) variantId = select.value;
        }

        if (!variantId) return;

        this.disabled = true;
        this.style.opacity = '0.5';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/cart/add.js', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = () => {
          this.disabled = false;
          this.style.opacity = '';
          if (xhr.status >= 200 && xhr.status < 300) {
            if (typeof window.updateSideCart === 'function') window.updateSideCart();
            showToast('Agregado al carrito');
            if (typeof window.openCartDrawer === 'function') window.openCartDrawer();
          }
        };

        xhr.send(JSON.stringify({ items: [{ id: variantId, quantity: 1 }] }));
      });
    });

    const wishlistBtn = heroRoot.querySelector('.pdp-hero--wishlist-button');

    function updateWishlistState() {
      if (!wishlistBtn) return;
      const handle = wishlistBtn.dataset.favoriteHandle;
      const favs = getFavorites();
      if (favs.includes(handle)) {
        wishlistBtn.classList.add('is-active');
      } else {
        wishlistBtn.classList.remove('is-active');
      }
      window.dispatchEvent(new CustomEvent('snc:wishlist-updated'));
    }

    if (wishlistBtn) {
      on(wishlistBtn, 'click', function() {
        this.classList.add('is-bouncing');
        this.addEventListener('animationend', () => {
          this.classList.remove('is-bouncing');
        }, { once: true });

        const handle = this.dataset.favoriteHandle;
        if (!handle) return;
        const favs = getFavorites();
        const idx = favs.indexOf(handle);
        if (idx >= 0) {
          favs.splice(idx, 1);
        } else {
          favs.push(handle);
        }
        saveFavorites(favs);
        updateWishlistState();
      });

      updateWishlistState();

      on(window, 'snc:wishlist-updated', updateWishlistState);
      on(window, 'storage', function(event) {
        if (event.key === FAVORITES_KEY) {
          updateWishlistState();
        }
      });
    }

    const imageContainer = heroRoot.querySelector('.pdp-hero--image-container');
    if (imageContainer) {
      on(imageContainer, 'mouseenter', () => {
        document.body.style.overflow = 'hidden';
      });

      on(imageContainer, 'mouseleave', () => {
        document.body.style.overflow = '';
      });
    }

    const sizeGuideBtn = heroRoot.querySelector('[data-open-size-guide]');
    if (sizeGuideBtn) {
      on(sizeGuideBtn, 'click', () => {
        const accs = heroRoot.querySelectorAll('[data-accordion]');
        accs.forEach(acc => {
          if (acc.textContent.toLowerCase().includes('talla') || acc.textContent.toLowerCase().includes('size')) {
            acc.classList.add('is-open');
            acc.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
    }

    const uspCarousels = heroRoot.querySelectorAll('[data-usp-carousel]');
    uspCarousels.forEach(carousel => {
      const track = carousel.querySelector('.pdp-hero--usp-carousel-track');
      const slides = carousel.querySelectorAll('.pdp-hero--usp-slide');
      const pagination = carousel.querySelector('[data-usp-pagination]');
      const prevBtn = carousel.querySelector('.pdp-hero--usp-arrow.prev');
      const nextBtn = carousel.querySelector('.pdp-hero--usp-arrow.next');

      if (!track || slides.length === 0) return;

      const autoplay = carousel.dataset.autoplay === 'true';
      const autoplaySpeed = (parseInt(carousel.dataset.autoplaySpeed) || 5) * 1000;
      let autoplayInterval;

      let currentIndex = 0;
      const slideCount = slides.length;
      const slideWidthPercent = 100 / slideCount;
      slides.forEach(slide => {
        slide.style.flex = `0 0 ${slideWidthPercent}%`;
        slide.style.width = `${slideWidthPercent}%`;
        slide.style.maxWidth = `${slideWidthPercent}%`;
      });
      track.style.width = `${slideCount * 100}%`;

      const updatePosition = () => {
        const translatePercent = (currentIndex / slideCount) * 100;
        track.style.transform = `translateX(-${translatePercent}%)`;
        if (pagination) {
          const dots = pagination.querySelectorAll('button');
          dots.forEach((dot, idx) => {
            dot.classList.toggle('is-active', idx === currentIndex);
          });
        }
      };

      const nextSlide = () => {
        currentIndex = (currentIndex + 1) % slideCount;
        updatePosition();
      };

      const prevSlide = () => {
        currentIndex = (currentIndex - 1 + slideCount) % slideCount;
        updatePosition();
      };

      if (nextBtn) on(nextBtn, 'click', () => {
        resetAutoplay();
        nextSlide();
      });

      if (prevBtn) on(prevBtn, 'click', () => {
        resetAutoplay();
        prevSlide();
      });

      const isDesignMode = window.Shopify && Shopify.designMode;
      const startAutoplay = () => {
        if (autoplay && slideCount > 1 && !isDesignMode) {
          autoplayInterval = setIntervalTracked(nextSlide, autoplaySpeed);
        }
      };

      const stopAutoplay = () => {
        if (autoplayInterval) clearInterval(autoplayInterval);
      };

      const resetAutoplay = () => {
        stopAutoplay();
        startAutoplay();
      };

      if (autoplay) {
        startAutoplay();
        on(carousel, 'mouseenter', stopAutoplay);
        on(carousel, 'mouseleave', startAutoplay);
      }

      if (pagination) {
        pagination.innerHTML = '';
        slides.forEach((_, idx) => {
          const dot = document.createElement('button');
          dot.setAttribute('type', 'button');
          dot.setAttribute('aria-label', `Ver mensaje ${idx + 1} de ${slideCount}`);
          on(dot, 'click', () => {
            currentIndex = idx;
            updatePosition();
            resetAutoplay();
          });
          pagination.appendChild(dot);
        });
      }

      updatePosition();
    });

    const cleanupWithSwiper = () => {
      if (reviewsSwiper && typeof reviewsSwiper.destroy === 'function') {
        reviewsSwiper.destroy(true, true);
      }
      cleanup();
    };

    return { cleanup: cleanupWithSwiper };
  });
})();

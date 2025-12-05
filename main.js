
    /* ---------------- Menu open/close and staggered animate ---------------- */
    (function() {
      const openBtn = document.getElementById('openMenuBtn');
      const closeBtn = document.getElementById('closeMenuBtn');
      const container = document.getElementById('menuContainer');
      const panel = document.getElementById('menuPanel');
      const backdrop = document.getElementById('menuBackdrop');
      const items = document.querySelectorAll('.menu-item');

      function openMenu() {
        container.classList.remove('hidden');
        container.style.display = 'block';
        container.setAttribute('aria-hidden', 'false');

        // show backdrop
        backdrop.classList.remove('backdrop-hidden');
        backdrop.classList.add('backdrop-visible');

        // slide panel in
        requestAnimationFrame(() => {
          panel.classList.remove('menu-off');
          panel.classList.add('menu-on');
        });

        // stagger menu items
        items.forEach((el, i) => {
          el.classList.remove('show');
          setTimeout(() => el.classList.add('show'), 90 * (i + 1));
        });

        // prevent body scroll while menu open
        document.body.style.overflow = 'hidden';
      }

      function closeMenu() {
        // slide panel out (to left)
        panel.classList.remove('menu-on');
        panel.classList.add('menu-off');

        backdrop.classList.remove('backdrop-visible');
        backdrop.classList.add('backdrop-hidden');

        // hide after transition
        setTimeout(() => {
          container.style.display = 'none';
          container.classList.add('hidden');
          container.setAttribute('aria-hidden', 'true');
          items.forEach(el => el.classList.remove('show'));
        }, 380);

        document.body.style.overflow = '';
      }

      openBtn && openBtn.addEventListener('click', openMenu);
      closeBtn && closeBtn.addEventListener('click', closeMenu);
      backdrop && backdrop.addEventListener('click', closeMenu);
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

      // init backdrop hidden
      backdrop && backdrop.classList.add('backdrop-hidden');
      container && (container.style.display = 'none');
      container && container.setAttribute('aria-hidden', 'true');
    })();

    /* ---------------- Scroll reveal using IntersectionObserver ---------------- */
    (function() {
      // Reveal observer used across the page
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.add('show');
          } else {
            // Optional: do not remove .show for persistent reveal. We keep it persistent for non-hero elements.
            // For hero we handle typing separately.
          }
        });
      }, { threshold: 0.12 });

      document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    })();

    /* ---------------- Hero typing animation (replays when hero leaves & re-enters) ---------------- */
    (function() {
      const section = document.getElementById('home');
      const typingSpan = document.getElementById('typing-paragraph');
      const typingSource = document.getElementById('typing-source');
      const fullText = (typingSource && typingSource.textContent) ? typingSource.textContent.trim() : '';
      const typingSpeed = 28; // ms per character - tweak for mobile feeling
      let typingTimer = null;
      let currentIndex = 0;

      if (!section || !typingSpan || !typingSource) return;

      function resetTyping() {
        clearInterval(typingTimer);
        typingTimer = null;
        currentIndex = 0;
        typingSpan.textContent = '';
        // restore caret
        typingSpan.style.borderRight = '2px solid rgba(255,255,255,0.85)';
      }

      function startTyping() {
        // If prefers-reduced-motion, show full text instantly
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          typingSpan.textContent = fullText;
          typingSpan.style.borderRight = '0';
          return;
        }

        clearInterval(typingTimer);
        typingTimer = setInterval(() => {
          if (currentIndex <= fullText.length - 1) {
            typingSpan.textContent += fullText[currentIndex];
            currentIndex++;
          } else {
            clearInterval(typingTimer);
            typingTimer = null;
            // remove caret after finished typing
            setTimeout(() => { typingSpan.style.borderRight = '0'; }, 350);
          }
        }, typingSpeed);
      }

      // Observe the hero section visibility and replay typing when it re-enters
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const isVisible = entry.intersectionRatio > 0.25;
          if (isVisible) {
            // reveal hero children with the same .reveal class (they will run from the other observer too)
            // start typing after small delay so reveal finishes slightly first
            setTimeout(() => {
              if (!typingSpan.textContent) startTyping();
            }, 160);
          } else {
            // when scrolled away, reset so it types again when re-entered
            resetTyping();
          }
        });
      }, { threshold: [0, 0.12, 0.25, 0.5] });

      io.observe(section);

      // Accessibility: if prefers reduced motion, show full text
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        typingSpan.textContent = fullText;
        typingSpan.style.borderRight = '0';
      }
    })();

    /* ---------------- Carousel logic (mobile) ---------------- */
    (function() {
      const track = document.getElementById('carouselTrack');
      if (!track) return;
      const cards = Array.from(track.children);
      const prevBtn = document.getElementById('carouselPrev');
      const nextBtn = document.getElementById('carouselNext');
      const dotsContainer = document.getElementById('carouselDots');

      let current = 0;

      // create dots
      cards.forEach((c, i) => {
        const d = document.createElement('button');
        d.className = 'w-2 h-2 rounded-full';
        d.style.background = '#D1D5DB'; // tailwind gray-300 equivalent
        d.style.opacity = i === 0 ? '1' : '.4';
        d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        d.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(d);
      });
      const dots = Array.from(dotsContainer.children);

      function layout() {
        // update classes for size: center current -> normal, neighbors small
        cards.forEach((card, idx) => {
          card.classList.remove('small', 'active', 'card-pop');
          if (idx === current) {
            card.classList.add('active', 'card-pop');
            card.setAttribute('aria-hidden', 'false');
          } else {
            card.classList.add('small');
            card.setAttribute('aria-hidden', 'true');
          }
        });

        // compute translate to center the current card
        const viewport = document.getElementById('carouselViewport');
        const vpW = viewport.clientWidth;
        // compute left offset of current card within track using getBoundingClientRect positions
        // We compute cumulative widths including gap using live measurements.
        let left = 0;
        for (let i = 0; i < current; i++) {
          const rect = cards[i].getBoundingClientRect();
          left += Math.round(rect.width);
        }
        const gap = 12; // same as CSS gap
        left += current * gap;

        // current card width
        const currentWidth = Math.round(cards[current].getBoundingClientRect().width);
        const targetX = Math.round((vpW - currentWidth) / 2);
        const translate = -(left - targetX);
        track.style.transform = `translateX(${translate}px)`;

        // update dots
        dots.forEach((d,i)=> d.style.opacity = i === current ? '1' : '.4');
      }

      function goTo(i) {
        if (i < 0) i = 0;
        if (i > cards.length - 1) i = cards.length - 1;
        current = i;
        layout();
      }

      function next() { goTo(Math.min(current + 1, cards.length - 1)); }
      function prev() { goTo(Math.max(current - 1, 0)); }

      nextBtn && nextBtn.addEventListener('click', next);
      prevBtn && prevBtn.addEventListener('click', prev);

      // touch swipe support
      let startX = 0;
      track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive:true});
      track.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        const threshold = 40;
        if (dx < -threshold) next();
        else if (dx > threshold) prev();
      }, {passive:true});

      // relayout on load and resize
      window.addEventListener('load', () => setTimeout(layout, 80));
      window.addEventListener('resize', () => setTimeout(layout, 120));
    })();


/* Fixed carousel JS — replaces the previous carousel script */
(function () {
  const track = document.getElementById('carouselTrack');
  if (!track) return;

  // select only the .card elements inside the track (avoid text nodes)
  const cards = Array.from(track.querySelectorAll('.card'));
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  const dotsContainer = document.getElementById('carouselDots');

  let current = 0;
  const lastIndex = cards.length - 1;
  const gap = 12; // must match CSS gap

  // clear existing dots (defensive — prevents duplicates)
  while (dotsContainer.firstChild) dotsContainer.removeChild(dotsContainer.firstChild);

  // build dots (one per card)
  cards.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', `Go to slide ${i + 1}`);
    btn.type = 'button';
    btn.className = ''; // optional class
    btn.addEventListener('click', () => goTo(i));
    if (i === 0) btn.classList.add('active');
    dotsContainer.appendChild(btn);
  });
  const dots = Array.from(dotsContainer.children);

  // ensure prev/next exist
  if (!prevBtn || !nextBtn) return;

  // centering/layout function
  function layout() {
    // update card classes
    cards.forEach((card, idx) => {
      if (idx === current) {
        card.classList.remove('small', 'bg-inactive');
        card.classList.add('active', 'bg-active');
        card.setAttribute('aria-hidden', 'false');
      } else {
        card.classList.remove('active', 'bg-active');
        // ensure small/bg-inactive exist for non-active
        card.classList.add('small', 'bg-inactive');
        card.setAttribute('aria-hidden', 'true');
      }
    });

    // compute translate so current card is centered in viewport
    const viewport = document.getElementById('carouselViewport');
    const vpW = viewport.clientWidth;

    // compute left offset (sum of widths + gaps) of cards before current
    let left = 0;
    for (let i = 0; i < current; i++) {
      // use offsetWidth to include padding/border
      left += cards[i].offsetWidth;
    }
    left += current * gap; // add gaps between previous cards

    const currentWidth = cards[current].offsetWidth;
    const targetX = Math.round((vpW - currentWidth) / 2);
    const translate = -(left - targetX);

    track.style.transform = `translateX(${translate}px)`;

    // update dots active state
    dots.forEach((d, i) => d.classList.toggle('active', i === current));

    // show/hide prev & next (no looping)
    if (current <= 0) {
      prevBtn.setAttribute('aria-hidden', 'true');
      prevBtn.style.display = 'none';
    } else {
      prevBtn.setAttribute('aria-hidden', 'false');
      prevBtn.style.display = 'flex';
    }

    if (current >= lastIndex) {
      nextBtn.setAttribute('aria-hidden', 'true');
      nextBtn.style.display = 'none';
    } else {
      nextBtn.setAttribute('aria-hidden', 'false');
      nextBtn.style.display = 'flex';
    }
  }

  function goTo(i) {
    if (i < 0) i = 0;
    if (i > lastIndex) i = lastIndex;
    if (i === current) return;
    current = i;
    layout();
  }

  function next() { goTo(Math.min(current + 1, lastIndex)); }
  function prev() { goTo(Math.max(current - 1, 0)); }

  // attach controls
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // touch swipe support
  let startX = 0;
  track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive:true});
  track.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const threshold = 40;
    if (dx < -threshold) next();
    else if (dx > threshold) prev();
  }, {passive:true});

  // relayout on load & resize (debounced behavior)
  window.addEventListener('load', () => setTimeout(layout, 60));
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });
})();


// energy page js 
// scripts.js
// Minimal JavaScript to add play/pause behavior for the hero video,
// a simple modal open/close, and a scroll-snap carousel controller.
// scripts.js
// Controls: hero video play/pause with autoplay attempt, simple newsletter modal,
// and a scroll-snap carousel with prev/next and pagination dots.
// Safe: checks for missing DOM nodes so it won't throw on pages without all elements.

document.addEventListener('DOMContentLoaded', function () {
  // HERO video play/pause
  const video = document.getElementById('hero-video');
  const ppBtn = document.getElementById('hero-playpause');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');

  if (video && ppBtn && iconPlay && iconPause) {
    // ensure video plays (autoplay muted usually allowed)
    const ensureAutoplay = async () => {
      try {
        // try to play the video (autoplay muted is allowed in most browsers)
        await video.play();
        ppBtn.setAttribute('aria-pressed', 'false');
        iconPause.classList.remove('hidden');
        iconPlay.classList.add('hidden');
        console.log('Autoplay started');
      } catch (e) {
        // autoplay refused — show play icon and expose controls so user can start
        iconPause.classList.add('hidden');
        iconPlay.classList.remove('hidden');
        ppBtn.setAttribute('aria-pressed', 'true');
        video.controls = true; // helpful fallback so user can start playback
        console.warn('Autoplay blocked — showing controls and play icon.', e);
      }
    };
    ensureAutoplay();

    ppBtn.addEventListener('click', function () {
      if (video.paused) {
        video.play().then(() => {
          ppBtn.setAttribute('aria-pressed', 'false');
          iconPause.classList.remove('hidden');
          iconPlay.classList.add('hidden');
        }).catch((err) => {
          console.error('Play failed:', err);
        });
      } else {
        video.pause();
        ppBtn.setAttribute('aria-pressed', 'true');
        iconPause.classList.add('hidden');
        iconPlay.classList.remove('hidden');
      }
    });

    // Optional: update play/pause icons if user uses native controls (keeps UI in sync)
    video.addEventListener('play', () => {
      iconPause.classList.remove('hidden');
      iconPlay.classList.add('hidden');
      ppBtn.setAttribute('aria-pressed', 'false');
    });
    video.addEventListener('pause', () => {
      iconPause.classList.add('hidden');
      iconPlay.classList.remove('hidden');
      ppBtn.setAttribute('aria-pressed', 'true');
    });
  } else {
    // If elements are missing, log but don't crash
    if (!video) console.info('No #hero-video found — skipping hero video setup.');
    if (!ppBtn) console.info('No #hero-playpause button found — skipping play/pause setup.');
  }

  // Simple modal show/hide logic
  const modal = document.getElementById('newsletter-modal');
  const modalClose = document.getElementById('modal-close');

  if (modal && modalClose) {
    // For demonstration: show modal once (remove for production if not desired)
    try {
      setTimeout(() => {
        modal.classList.remove('hidden');
      }, 800); // small delay to avoid being too intrusive
    } catch (e) {
      console.warn('Failed to show modal automatically:', e);
    }

    modalClose.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  } else {
    if (!modal) console.info('No #newsletter-modal found — skipping modal setup.');
  }

  // CAROUSEL functionality (scroll-snap)
  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const dotsContainer = document.getElementById('carousel-dots');

  if (track && dotsContainer) {
    // Build dots based on slides
    const slides = Array.from(track.children).filter(n => n.nodeType === 1); // element nodes only
    if (slides.length === 0) {
      console.info('No slides found inside #carousel-track — skipping carousel setup.');
    } else {
      slides.forEach((slide, idx) => {
        const btn = document.createElement('button');
        btn.className = 'w-3 h-3 rounded-full bg-gray-300';
        btn.setAttribute('aria-label', 'Go to slide ' + (idx + 1));
        btn.addEventListener('click', () => {
          slide.scrollIntoView({ behavior: 'smooth', inline: 'start' });
        });
        dotsContainer.appendChild(btn);
      });

      const dots = Array.from(dotsContainer.children);

      // Update active dot based on scroll position
      const updateActiveDot = () => {
        const scrollLeft = track.scrollLeft;
        // find the slide whose offsetLeft is closest to scrollLeft
        let active = 0;
        let minDiff = Infinity;
        slides.forEach((s, i) => {
          const diff = Math.abs(scrollLeft - s.offsetLeft);
          if (diff < minDiff) {
            minDiff = diff;
            active = i;
          }
        });
        dots.forEach((d, i) => {
          d.style.backgroundColor = i === active ? '#0ea5e9' : '';
          d.classList.toggle('ring-2', i === active);
        });
      };

      // Throttled scroll handler to avoid tight loops during scrolling
      track.addEventListener('scroll', throttle(updateActiveDot, 100));
      // initial set
      updateActiveDot();

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          const visibleIndex = getVisibleIndex();
          const target = Math.max(0, visibleIndex - 1);
          slides[target].scrollIntoView({ behavior: 'smooth', inline: 'start' });
        });
      } else {
        console.info('No #carousel-prev found — prev button disabled.');
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          const visibleIndex = getVisibleIndex();
          const target = Math.min(slides.length - 1, visibleIndex + 1);
          slides[target].scrollIntoView({ behavior: 'smooth', inline: 'start' });
        });
      } else {
        console.info('No #carousel-next found — next button disabled.');
      }

      function getVisibleIndex() {
        const scrollLeft = track.scrollLeft;
        let idx = 0;
        let minDiff = Infinity;
        slides.forEach((s, i) => {
          const diff = Math.abs(scrollLeft - s.offsetLeft);
          if (diff < minDiff) {
            minDiff = diff;
            idx = i;
          }
        });
        return idx;
      }
    }
  } else {
    if (!track) console.info('No #carousel-track found — skipping carousel setup.');
    if (!dotsContainer) console.info('No #carousel-dots found — skipping dots setup.');
  }

  // throttle utility
  function throttle(fn, wait) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  }
});

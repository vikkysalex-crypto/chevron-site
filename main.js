
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


// Sustainability dropdown
const sustainBtn = document.getElementById('sustainBtn');
const sustainDropdown = document.getElementById('sustainDropdown');
const sustainArrow = document.getElementById('sustainArrow');

sustainBtn.addEventListener('click', () => {
  sustainDropdown.classList.toggle('hidden');
  sustainArrow.classList.toggle('rotate-180');
});



// career js
// scripts.js - defensive video play/pause helper
document.addEventListener('DOMContentLoaded', function () {
  // find any video with data-grid-video attribute and wire a toggle if an associated button exists
  document.querySelectorAll('video').forEach((video) => {
    // do nothing if no controls wanted
    // if you want per-video controls, give the button an id related to the video
    // e.g. <button data-video-toggle="#myVideo"> and video id="myVideo"
  });

  // small helper: reveal elements with .reveal when in viewport (very lightweight)
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    // fallback: instantly reveal
    revealEls.forEach(el => el.classList.add('revealed'));
  }
});


// footer-accordion.js
document.addEventListener('DOMContentLoaded', function () {
  const accordionRoot = document.getElementById('footer-accordion');
  if (!accordionRoot) return;

  // find all accordion groups (button + target list)
  accordionRoot.querySelectorAll('button[aria-controls]').forEach(button => {
    const targetId = button.getAttribute('aria-controls');
    const panel = document.getElementById(targetId);
    if (!panel) return;

    // collapse initially on mobile
    // ensure accessible attributes
    button.setAttribute('aria-expanded', 'false');
    panel.style.display = 'none';
    panel.setAttribute('aria-hidden', 'true');

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        // close
        button.setAttribute('aria-expanded', 'false');
        panel.style.display = 'none';
        panel.setAttribute('aria-hidden', 'true');
      } else {
        // open
        button.setAttribute('aria-expanded', 'true');
        panel.style.display = 'block';
        panel.setAttribute('aria-hidden', 'false');
      }
    });

    // Optionally close on outside click — not necessary for footer
  });

  // Optional: when viewport >= md, ensure all panels visible (desktop layout)
  function checkResize() {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    accordionRoot.querySelectorAll('button[aria-controls]').forEach(button => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (!panel) return;
      if (isDesktop) {
        panel.style.display = 'flex';
        panel.style.flexWrap = 'wrap';
        panel.setAttribute('aria-hidden', 'false');
        button.setAttribute('aria-expanded', 'true');
      } else {
        // restore mobile default if not opened
        if (button.getAttribute('data-open') !== 'true') {
          panel.style.display = 'none';
          panel.setAttribute('aria-hidden', 'true');
          button.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }
  window.addEventListener('resize', checkResize);
  checkResize();
});


// contact js
/* script.js
   Recreates the form behaviors from your original code using vanilla JS:
   - dependent sub-topic options (with data-parent + data-url redirect support)
   - custom validation UI & error list
   - comments length counter
   - recaptcha callback handling
   - modal open/close
*/

(function () {
  // grab elements
  const form = document.getElementById('contactForm');
  const topic = document.getElementById('topic');
  const subtopic = document.getElementById('subtopic');
  const phoneRow = document.getElementById('phoneRow');
  const mediaAffRow = document.getElementById('mediaAffRow');
  const comments = document.getElementById('comments');
  const commentsCount = document.getElementById('commentsCount');
  const errorList = document.getElementById('errorMessages');
  const recapWidget = document.getElementById('recapWidget');
  const thanks = document.getElementById('thanks');

  // modal elements
  const openModalBtn = document.getElementById('openModal');
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('closeModal');
  const modalBackdrop = document.getElementById('modalBackdrop');

  // Build a dataset of all sub-topic options exactly as in your original markup
  // For brevity the list replicates relevant entries (add more if necessary)
  const subTopicOptions = [
    { value: '', label: '', parent: 'service-stations' },
    { value: '', label: '', parent: 'msds' },
    { value: 'Fuel', label: 'Fuels', parent: 'products' },
    { value: '', label: 'Fuels - Technical Questions', parent: 'products' },
    { value: 'Lubricants', label: 'Lubricants', parent: 'products' },
    { value: '', label: 'Lubricants - Technical Questions', parent: 'products', url: 'http://chevron-gsc.force.com/lubeteksupport' },
    { value: '', label: 'Where to Buy', parent: 'products', url: 'https://www.chevronlubricants.com/en_us/home/where-to-buy.html' },
    { value: 'Chemicals', label: 'Chemicals', parent: 'products' },
    { value: 'Aviation', label: 'Aviation', parent: 'products' },
    { value: 'Diesel', label: 'Diesel', parent: 'products' },
    { value: '', label: 'Crude Oil', parent: 'products', url: 'https://crudemarketing.chevron.com/' },
    { value: 'Historical Research', label: 'Historical Research', parent: 'research' },
    { value: 'Climate Change', label: 'Climate Change', parent: 'research' },
    { value: 'Greenhouse Gas', label: 'Greenhouse Gas', parent: 'research' },
    { value: 'Environment, Social, and Governance', label: 'Environment, Social, and Governance', parent: 'research' },
    { value: 'Careers and Employment', label: 'Retirement & Benefits', parent: 'jobs-internships-and-employment' },
    { value: 'Careers and Employment', label: 'Employment', parent: 'jobs-internships-and-employment', url: 'https://careers.chevron.com' },
    { value: 'Careers and Employment', label: 'Internship', parent: 'jobs-internships-and-employment', url: 'https://careers.chevron.com/students-and-graduates/internship-programs' },
    { value: 'Careers and Employment', label: 'Employment Verification', parent: 'jobs-internships-and-employment', url: 'https://www.chevron.com/about/contact/human-resources' },
    // ... add any other options you need to match original
  ];

  // Populate subtopic select from dataset
  function populateSubTopics(parentKey) {
    subtopic.innerHTML = '';
    const matches = subTopicOptions.filter(o => o.parent === parentKey);
    if (matches.length === 0) {
      subtopic.disabled = true;
      subtopic.innerHTML = '<option value="">--</option>';
      return;
    }
    subtopic.disabled = false;
    // add first empty option if desired
    const first = document.createElement('option');
    first.value = '';
    first.textContent = '';
    subtopic.appendChild(first);

    matches.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.value || '';
      el.textContent = opt.label || '';
      if (opt.url) el.dataset.url = opt.url;
      if (opt.parent) el.dataset.parent = opt.parent;
      subtopic.appendChild(el);
    });
  }

  // topic change handler: redirect if topic option has data-url OR populate subtopics
  topic.addEventListener('change', function (e) {
    const selected = topic.selectedOptions[0];
    if (!selected) return;
    const url = selected.getAttribute('data-url');
    const topicKey = selected.getAttribute('data-topic');

    // show/hide media-relations rows
    if (topicKey === 'media-relations') {
      phoneRow.classList.remove('hidden');
      mediaAffRow.classList.remove('hidden');
    } else {
      phoneRow.classList.add('hidden');
      mediaAffRow.classList.add('hidden');
    }

    if (url) {
      // Redirect flow: reset selects and open url in new tab
      // (mirrors original behavior: reset select to index 0)
      window.open(url, '_blank');
      topic.selectedIndex = 0;
      subtopic.innerHTML = '';
      subtopic.disabled = true;
      return;
    }

    if (topicKey) {
      populateSubTopics(topicKey);
    } else {
      subtopic.innerHTML = '';
      subtopic.disabled = true;
    }
  });

  // subtopic change: if selected option has data-url, open and reset selects (like original)
  subtopic.addEventListener('change', function () {
    const selected = subtopic.selectedOptions[0];
    if (!selected) return;
    const url = selected.dataset.url;
    if (url) {
      window.open(url, '_blank');
      // reset selects
      topic.selectedIndex = 0;
      subtopic.innerHTML = '';
      subtopic.disabled = true;
    }
  });

  // Comments counter
  comments.addEventListener('input', () => {
    const len = Math.min(comments.value.length, 1000);
    commentsCount.textContent = String(len);
  });

  // reCAPTCHA callback: called by global callback defined in HTML attribute
  window.recapCallback = function () {
    // remove recaptcha error indicator if present
    const recaptchaMsg = document.getElementById('recapWidgetmessage');
    if (recaptchaMsg) recaptchaMsg.classList && recaptchaMsg.classList.add('hide');
    recapWidget.classList && recapWidget.classList.remove('recap-error');

    // if no other errors, hide the error list
    if (errorList.children.length === 0) {
      errorList.classList.add('hidden');
    }
  };

  // Validation UI: build list of required fields and show messages like original
  function showValidationErrors(invalidElements) {
    // Build error list
    errorList.innerHTML = '';
    invalidElements.forEach(el => {
      const name = el.getAttribute('data-error-name') || el.name || 'Field';
      const li = document.createElement('li');
      li.textContent = `${name}: ${el.validationMessage || 'This field is required.'}`;
      errorList.appendChild(li);
    });
    errorList.classList.remove('hidden');

    // Focus first invalid item
    if (invalidElements.length) {
      invalidElements[0].focus();
    }
  }

  // Form submit handling (prevent submit when invalid or recaptcha not checked)
  form.addEventListener('submit', function (e) {
    // perform HTML5 validity check
    const invalids = Array.from(form.querySelectorAll('[required]')).filter(f => !f.checkValidity());

    // check recaptcha
    const recaptchaResponse = window.grecaptcha && grecaptcha.getResponse && grecaptcha.getResponse().length > 0;

    if (invalids.length > 0 || !recaptchaResponse) {
      e.preventDefault();
      // mark recaptcha error if not checked
      if (!recaptchaResponse) {
        // create a visible recaptcha message if not present in errorList
        const existingRecap = Array.from(errorList.children).some(li => li.textContent && li.textContent.toLowerCase().includes('recaptcha'));
        if (!existingRecap) {
          const li = document.createElement('li');
          li.textContent = 'Please validate reCaptcha';
          errorList.appendChild(li);
        }
        recapWidget.classList.add('recap-error');
      }
      showValidationErrors(invalids);
      return false;
    }

    // If all good, let the form submit naturally.
    // (Because this posts to Salesforce WebToCase, we do not attempt to AJAX it.)
    return true;
  });

  // Utility: on input, update validation UI (remove error for that field)
  form.querySelectorAll('[required]').forEach(field => {
    field.addEventListener('input', (e) => {
      // remove that field from error list if present
      const items = Array.from(errorList.children);
      const name = field.getAttribute('data-error-name');
      items.forEach(li => {
        if (li.textContent && name && li.textContent.startsWith(name + ':')) {
          li.remove();
        }
      });
      if (errorList.children.length === 0) errorList.classList.add('hidden');

      // remove styling hint
      field.classList.remove('error');
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
  });

  // Modal open/close
  openModalBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });
  closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });
  modalBackdrop.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  });

  // On page load: if referrer contains salesforce.com, show thanks and hide form (like original)
  window.addEventListener('load', () => {
    try {
      if (document.referrer && document.referrer.indexOf('salesforce.com') > -1) {
        form.classList.add('hidden');
        thanks.classList.remove('hidden');
      }
    } catch (err) {
      // ignore cross-origin access
    }
  });

  // Prefill topic from URL querystring if provided (like original)
  (function prefillFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('topic');
    if (t) {
      const opts = Array.from(topic.options);
      for (let i = 0; i < opts.length; i++) {
        if (opts[i].text && opts[i].text.toLowerCase() === t.toLowerCase()) {
          topic.selectedIndex = i;
          topic.dispatchEvent(new Event('change'));
          break;
        }
      }
    }
  })();

})();

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import logo from '../../assets/toodle_tutor_management_logo.png';
import './welcomeIntro.css';
import { prepareWelcomeLogo } from './welcomeLogo';

const SESSION_KEY = 'toodle.welcomePlayed';
const WELCOME_DURATION = 2000;
let playedWithoutStorage = false;
function shouldPlay() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    return !sessionStorage.getItem(SESSION_KEY);
  } catch {
    return !playedWithoutStorage;
  }
}

// Mounted only on public entry points, never in the authenticated shell.
export default function WelcomeIntro({ children, footer }) {
  const [playing, setPlaying] = useState(shouldPlay);
  const [ready, setReady] = useState(false);
  const [welcomeLogo, setWelcomeLogo] = useState(logo);
  const welcomeRef = useRef(null);
  const brandRef = useRef(null);
  const signInRef = useRef(null);
  const footerRef = useRef(null);
  useEffect(() => {
    let active = true;
    prepareWelcomeLogo()
      .then(({ src }) => {
        if (!active) return;
        if (src !== logo) setWelcomeLogo(src);
        setReady(true);
      })
      .catch(() => {
        // Keep the original asset if image processing is unavailable.
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useLayoutEffect(() => {
    const welcome = welcomeRef.current;
    const brand = brandRef.current;
    const signIn = signInRef.current;
    const measure = () => {
      const footerHeight = footerRef.current?.offsetHeight || 0;
      welcome.style.setProperty('--welcome-footer-height', `${footerHeight}px`);
      if (!brand.offsetWidth) return;
      const margin = parseFloat(getComputedStyle(signIn).marginTop) || 0;
      welcome.style.setProperty('--welcome-rise', `${(signIn.offsetHeight + margin) / 2}px`);
      const introWidth = Math.min(480, innerWidth - 12, (innerHeight - footerHeight - 120) / 0.68);
      welcome.style.setProperty(
        '--welcome-intro-scale',
        String(Math.max(1, introWidth / brand.offsetWidth))
      );
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(brand);
    observer?.observe(signIn);
    if (footerRef.current) observer?.observe(footerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [playing]);
  useEffect(() => {
    playedWithoutStorage = true;
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      /* Storage unavailable. */
    }
    if (!playing) return;
    const timer = ready
      ? window.setTimeout(() => {
          setPlaying(false);
        }, WELCOME_DURATION)
      : undefined;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const reduceMotion = (event) => {
      if (event.matches) {
        setPlaying(false);
      }
    };
    media?.addEventListener?.('change', reduceMotion);
    return () => {
      window.clearTimeout(timer);
      media?.removeEventListener?.('change', reduceMotion);
    };
  }, [playing, ready]);
  return (
    <div
      ref={welcomeRef}
      className={`welcome-intro ${playing ? 'is-playing' : 'is-ready'}${footer ? ' has-footer' : ''}`}
      data-intro-ready={ready || undefined}
      style={{
        '--welcome-duration': `${WELCOME_DURATION}ms`,
      }}
      aria-label="Welcome to Toodle"
      role="main"
    >
      <div className="welcome-intro-stage">
        <div ref={brandRef} className="welcome-intro-brand" aria-hidden="true">
          <div className="welcome-intro-original">
            <div className="welcome-logo-frame">
              <img src={welcomeLogo} alt="" />
            </div>
            <span>Toodle</span>
          </div>
        </div>
        <div
          ref={signInRef}
          className="welcome-signin-content"
          aria-hidden={playing || undefined}
          inert={playing || undefined}
        >
          {children}
        </div>
      </div>
      {footer && (
        <div
          ref={footerRef}
          className="welcome-footer"
          aria-hidden={playing || undefined}
          inert={playing || undefined}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

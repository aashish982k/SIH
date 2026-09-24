'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { gsap, SplitText, ScrollTrigger, useGSAP } from '@/lib/motion/gsap';
import { useAnimationContext } from '@/lib/motion/AnimationContext';
import { ArrowRight, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const aboutTextRef = useRef<HTMLHeadingElement>(null);
  
  const { hasPlayedHero, setHasPlayedHero, prefersReducedMotion } = useAnimationContext();
  const user = useAppStore((state) => state.user);

  useGSAP(() => {
    if (prefersReducedMotion) return;

    // ─── Hero Animation ────────────────────────────────────────────────────────
    if (!hasPlayedHero && heroTextRef.current && heroSubRef.current && buttonRef.current) {
      // Split the headline into lines
      const splitHeadline = new SplitText(heroTextRef.current, { type: 'lines' });
      const splitSub = new SplitText(heroSubRef.current, { type: 'lines' });

      // Wrap lines in overflow-hidden divs for the mask reveal effect
      splitHeadline.lines.forEach(line => {
        const wrapper = document.createElement('div');
        wrapper.style.overflow = 'hidden';
        line.parentNode?.insertBefore(wrapper, line);
        wrapper.appendChild(line);
      });

      const tl = gsap.timeline({
        onComplete: () => {
          setHasPlayedHero(true);
          splitHeadline.revert();
          splitSub.revert();
        }
      });

      tl.from(splitHeadline.lines, {
        yPercent: 100,
        opacity: 0,
        filter: 'blur(8px)',
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.1,
      })
      .from(splitSub.lines, {
        yPercent: 100,
        opacity: 0,
        duration: 1.0,
        ease: 'power3.out',
        stagger: 0.05,
      }, "-=0.8")
      .from(buttonRef.current, {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'power3.out',
      }, "-=0.6");
    }

    // ─── About Section Scroll Animation ─────────────────────────────────────────
    if (aboutTextRef.current) {
      const splitAbout = new SplitText(aboutTextRef.current, { type: 'words' });
      
      gsap.fromTo(splitAbout.words, 
        {
          opacity: 0.2,
        },
        {
          opacity: 1,
          stagger: 0.1,
          ease: 'none',
          scrollTrigger: {
            trigger: aboutTextRef.current,
            start: 'top 80%',
            end: 'bottom 40%',
            scrub: 0.5,
          }
        }
      );
    }
  }, { scope: containerRef, dependencies: [hasPlayedHero, prefersReducedMotion] });

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      
      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col justify-center min-h-[90vh] px-6 py-24 overflow-hidden border-b border-border">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00E5FF08_1px,transparent_1px),linear-gradient(to_bottom,#00E5FF08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 pulse-live"></span>
            System Online & Active
          </div>
          
          <h1 
            ref={heroTextRef}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.05]"
          >
            Nearby Wells <br className="hidden md:block" />
            <span className="text-primary">Intelligence System</span>
          </h1>
          
          <p 
            ref={heroSubRef}
            className="max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed font-sans"
          >
            Precision monitoring and real-time risk assessment for drilling operations. 
            Leveraging historical data and AI to secure the future of energy extraction.
          </p>
          
          <div ref={buttonRef}>
            <Link href={user ? "/dashboard" : "/login"}>
              <Button size="lg" className="group h-14 px-8 text-base font-semibold shadow-[0_0_40px_-10px_rgba(0,229,255,0.4)]">
                Access Dashboard
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Mission / About Section ─────────────────────────────────────────── */}
      <section className="relative px-6 py-32 md:py-48 max-w-4xl mx-auto">
        <h2 
          ref={aboutTextRef}
          className="text-3xl md:text-5xl lg:text-6xl font-serif font-medium leading-tight text-foreground"
        >
          We unify real-time telemetry with historical well data to predict drilling risks before they escalate. Our platform ensures operational safety through continuous monitoring and actionable AI intelligence.
        </h2>
      </section>

      {/* ─── Features Section ────────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-card/50 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Activity className="h-6 w-6 text-primary" />}
              title="Real-time Monitoring"
              description="Continuous ingestion of eRTMAC feeds to track drilling depth and current parameters with zero latency."
            />
            <FeatureCard 
              icon={<ShieldAlert className="h-6 w-6 text-destructive" />}
              title="Risk Assessment"
              description="Automated cross-referencing against offset well data to instantly highlight high-risk depth intervals."
            />
            <FeatureCard 
              icon={<Cpu className="h-6 w-6 text-[var(--risk-medium)]" />}
              title="AI Insights"
              description="Generative analysis of historical reports, identifying past complications and recommending preemptive actions."
            />
          </div>
        </div>
      </section>
      
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-background border border-border hover:border-primary/30 transition-colors duration-300">
      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { gsap, SplitText, useGSAP } from '@/lib/motion/gsap';
import { useAnimationContext } from '@/lib/motion/AnimationContext';
import { ArrowRight, Activity, ShieldAlert, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/appStore';
import { motion, useMotionTemplate, useMotionValue, Variants } from 'framer-motion';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  const { hasPlayedHero, setHasPlayedHero, prefersReducedMotion } = useAnimationContext();
  const user = useAppStore((state) => state.user);

  useGSAP(() => {
    if (prefersReducedMotion) return;

    // ─── Hero Initial Load Animation ───────────────────────────────────────────
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

    // ─── Scroll Parallax Descent ───────────────────────────────────────────────
    if (heroSectionRef.current && heroContentRef.current) {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroSectionRef.current,
          start: 'top top',
          end: '+=150%', // Pin for 150% of viewport height
          scrub: 1.2,
          pin: true,
          pinSpacing: true, // Allow next section to scroll up naturally
        }
      });

      // Background grid zoom and fade
      scrollTl.to('.hero-grid', {
        scale: 2.5,
        opacity: 0,
        ease: 'power1.inOut',
      }, 0);

      // Deep cinematic scaling of the hero content
      scrollTl.to(heroContentRef.current, {
        scale: 6,
        opacity: 0,
        yPercent: -20, // Drift slightly up as it scales
        ease: 'power2.in',
      }, 0);
      
      // Additional parallax for elements inside the hero to move at different speeds
      if (heroSubRef.current && buttonRef.current) {
        scrollTl.to([heroSubRef.current, buttonRef.current], {
          y: -100,
          opacity: 0,
          ease: 'power1.in',
        }, 0);
      }
    }
  }, { scope: containerRef, dependencies: [hasPlayedHero, prefersReducedMotion] });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: "easeOut" }
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground selection:bg-primary/30 relative">
      
      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <section ref={heroSectionRef} className="relative flex flex-col justify-center min-h-screen px-6 overflow-hidden border-b border-border bg-background">

        {/* Subtle grid overlay for texture with GSAP class */}
        <div className="hero-grid absolute inset-[-100px] z-0 bg-[linear-gradient(to_right,#00E5FF08_1px,transparent_1px),linear-gradient(to_bottom,#00E5FF08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,#000_70%,transparent_100%)] pointer-events-none origin-center" />
        
        <div ref={heroContentRef} className="relative z-10 max-w-5xl mx-auto w-full pointer-events-none origin-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-3 py-1 text-sm text-primary shadow-[0_0_15px_rgba(0,229,255,0.1)] pointer-events-auto cursor-default"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 pulse-live shadow-[0_0_8px_#00E5FF]"></span>
            System Online & Active
          </motion.div>
          
          <h1 
            ref={heroTextRef}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.05]"
          >
            Nearby Wells <br className="hidden md:block" />
            <span className="text-primary drop-shadow-[0_0_15px_rgba(0,229,255,0.2)]">Intelligence System</span>
          </h1>
          
          <p 
            ref={heroSubRef}
            className="max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed font-sans"
          >
            Precision monitoring and real-time risk assessment for drilling operations. 
            Leveraging historical data and AI to secure the future of energy extraction.
          </p>
          
          <div ref={buttonRef} className="pointer-events-auto">
            <Link href={user ? "/dashboard" : "/login"}>
              <Button size="lg" className="group h-14 px-8 text-base font-semibold shadow-[0_0_40px_-10px_rgba(0,229,255,0.3)] backdrop-blur-md bg-primary hover:bg-primary/90 text-primary-foreground relative overflow-hidden transition-all duration-300">
                <span className="relative z-10 flex items-center">
                  Access Dashboard
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-110" />
                </span>
                {/* Button shine effect on hover */}
                <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out z-0" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Mission / About Section ─────────────────────────────────────────── */}
      <section className="relative px-6 py-32 md:py-48 max-w-4xl mx-auto bg-background z-10 overflow-hidden">
        {/* Decorative background glow for mission statement */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.h2 
          initial={{ opacity: 0, y: 40, filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-3xl md:text-5xl lg:text-6xl font-serif font-medium leading-tight text-foreground text-center"
        >
          We unify real-time telemetry with historical well data to predict drilling risks before they escalate. Our platform ensures operational safety through continuous monitoring and actionable AI intelligence.
        </motion.h2>
      </section>

      {/* ─── Features Section ────────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-card/20 border-t border-border z-10 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            <motion.div variants={itemVariants}>
              <FeatureCard 
                icon={<Activity className="h-6 w-6 text-primary" />}
                title="Real-time Monitoring"
                description="Continuous ingestion of eRTMAC feeds to track drilling depth and current parameters with zero latency."
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <FeatureCard 
                icon={<ShieldAlert className="h-6 w-6 text-destructive" />}
                title="Risk Assessment"
                description="Automated cross-referencing against offset well data to instantly highlight high-risk depth intervals."
                accentColor="rgba(239, 68, 68, 0.15)"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <FeatureCard 
                icon={<Cpu className="h-6 w-6 text-[var(--risk-medium)]" />}
                title="AI Insights"
                description="Generative analysis of historical reports, identifying past complications and recommending preemptive actions."
                accentColor="rgba(245, 158, 11, 0.15)"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>
      
    </div>
  );
}

// Highly aesthetic Framer Motion Spotlight Card
function FeatureCard({ 
  icon, 
  title, 
  description, 
  accentColor = "rgba(0, 229, 255, 0.15)" 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  accentColor?: string;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div 
      onMouseMove={handleMouseMove}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative p-8 rounded-2xl bg-card border border-border/50 overflow-hidden cursor-pointer h-full shadow-sm hover:shadow-xl transition-shadow duration-500"
    >
      {/* Spotlight Effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100 z-0"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              ${accentColor},
              transparent 80%
            )
          `,
        }}
      />
      
      <div className="relative z-10">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner border border-primary/20 transition-colors duration-300 group-hover:bg-primary/20"
        >
          {icon}
        </motion.div>
        
        <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        
        <p className="text-muted-foreground leading-relaxed group-hover:text-muted-foreground/90 transition-colors duration-300">
          {description}
        </p>
      </div>
      
      {/* Decorative ambient background glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 z-0 pointer-events-none" style={{ backgroundColor: accentColor.replace('0.15', '1') }} />
    </motion.div>
  );
}

'use client';

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrollTrigger, ScrambleTextPlugin, useGSAP);
}

export { gsap, SplitText, ScrollTrigger, ScrambleTextPlugin, useGSAP };

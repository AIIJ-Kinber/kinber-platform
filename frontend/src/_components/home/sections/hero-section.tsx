'use client';

import { HeroVideoSection } from '@/components/home/sections/hero-video-section';
import { siteConfig } from '@/lib/home';
import { ArrowRight, Github, X, AlertCircle, Square } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { FlickeringGrid } from "@/_components/home/ui/flickering-grid";
import { useScroll } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from '@/components/ui/dialog';

import { isLocalMode, config } from '@/lib/config';
import { toast } from 'sonner';
import { useModal } from '@/hooks/use-modal-store';

import ChatInput, { ChatInputHandles } from '@/components/thread/chat-input/chat-input';
import { normalizeFilenameToNFC } from '@/lib/utils/unicode';

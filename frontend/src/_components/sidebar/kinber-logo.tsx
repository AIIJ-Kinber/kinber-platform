import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useSidebar } from '@/_components/ui/sidebar';

interface KinberLogoProps {
  size?: number;
}

export function KinberLogo({ size = 15 }: KinberLogoProps) {
  const { state } = useSidebar();
  
  // Reduce size when sidebar is collapsed
  const logoSize = state === 'collapsed' ? size * 1.65 : size; // 40% smaller when collapsed
  const logoWidth = state === 'collapsed' ? logoSize * 1.5 : logoSize * 2.5; // Reduce width multiplier too

  return (
    <div className={cn(
      "flex items-center transition-all duration-200",
      state === 'collapsed' ? "justify-center" : "justify-start"
    )}>
      <Image
        src="/black_dash.png"
        alt="Kinber"
        width={logoWidth}
        height={logoSize}
        className="hidden dark:block transition-all duration-200"
      />
    </div>
  );
}
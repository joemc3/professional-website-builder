import React from 'react';

interface QuartzFooterProps {
  fullName: string;
}

export function QuartzFooter({ fullName }: QuartzFooterProps) {
  return (
    <footer className="bg-[var(--quartz-navy)] py-6">
      <div className="max-w-6xl mx-auto px-6 text-center text-blue-300 text-sm">
        <p>&copy; {new Date().getFullYear()} {fullName}. All rights reserved.</p>
      </div>
    </footer>
  );
}

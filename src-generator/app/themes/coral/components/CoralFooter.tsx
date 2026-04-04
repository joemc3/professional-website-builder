import React from 'react';

interface CoralFooterProps {
  fullName: string;
}

export function CoralFooter({ fullName }: CoralFooterProps) {
  return (
    <footer className="bg-[var(--coral-text)] py-8">
      <div className="max-w-6xl mx-auto px-6 text-center text-[var(--coral-border)]">
        <p>&copy; {new Date().getFullYear()} {fullName}. All rights reserved.</p>
      </div>
    </footer>
  );
}

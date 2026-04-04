import React from 'react';

interface JadeFooterProps {
  fullName: string;
}

export function JadeFooter({ fullName }: JadeFooterProps) {
  return (
    <footer className="bg-[var(--jade-primary)] py-8">
      <div className="max-w-5xl mx-auto px-6 text-center text-[var(--jade-secondary)]">
        <p>&copy; {new Date().getFullYear()} {fullName}. All rights reserved.</p>
      </div>
    </footer>
  );
}

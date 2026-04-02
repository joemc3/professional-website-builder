import React from 'react';

interface OnyxFooterProps {
  fullName: string;
}

export function OnyxFooter({ fullName }: OnyxFooterProps) {
  return (
    <footer className="bg-[var(--onyx-900)] border-t border-[var(--onyx-700)] py-8">
      <div className="max-w-6xl mx-auto px-6 text-center text-gray-400">
        <p>&copy; {new Date().getFullYear()} {fullName}. All rights reserved.</p>
      </div>
    </footer>
  );
}

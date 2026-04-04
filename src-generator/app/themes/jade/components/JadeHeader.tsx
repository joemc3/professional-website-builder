import React from 'react';
import { Profile } from '@/types/portfolio';
import { PhotoFrame } from '@/primitives';

interface JadeHeaderProps {
  profile: Profile;
  subtitle?: string;
}

export function JadeHeader({ profile, subtitle }: JadeHeaderProps) {
  return (
    <header className="bg-[var(--jade-primary)] text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-8">
          <PhotoFrame
            src={profile.photo}
            alt={profile.fullName}
            shape="circle"
            size="w-28 h-28"
            className="border-4 border-[var(--jade-secondary)]"
          />
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold">
              {profile.fullName}
            </h1>
            <p className="text-xl text-[var(--jade-secondary)] mt-2">{profile.title}</p>
            {subtitle && (
              <p className="text-white/80 mt-1 text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        {profile.summary && (
          <p className="text-white/90 mt-8 max-w-3xl leading-relaxed text-lg">
            {profile.summary}
          </p>
        )}
      </div>
    </header>
  );
}

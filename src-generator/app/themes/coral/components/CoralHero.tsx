import React from 'react';
import { Profile } from '@/types/portfolio';
import { PhotoFrame } from '@/primitives';

interface CoralHeroProps {
  profile: Profile;
}

export function CoralHero({ profile }: CoralHeroProps) {
  return (
    <section id="about" className="min-h-[80vh] flex items-center bg-gradient-to-br from-[var(--coral-bg)] to-[var(--coral-surface)]">
      <div className="section-container w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="accent-bar mb-6" />
            <h1 className="text-5xl md:text-6xl font-heading font-bold text-[var(--coral-text)] mb-4 leading-tight">
              {profile.fullName}
            </h1>
            <h2 className="text-2xl md:text-3xl text-[var(--coral-primary)] font-heading font-semibold mb-6">
              {profile.title}
            </h2>
            {profile.summary && (
              <p className="text-lg text-[var(--coral-text-muted)] leading-relaxed">
                {profile.summary}
              </p>
            )}
            <div className="mt-8">
              <a
                href="#contact"
                className="inline-block bg-[var(--coral-primary)] text-white font-semibold px-8 py-3 rounded-full hover:bg-[var(--coral-primary-light)] transition-colors"
              >
                Let&apos;s Connect
              </a>
            </div>
          </div>
          <div className="flex justify-center">
            <PhotoFrame
              src={profile.photo}
              alt={profile.fullName}
              shape="rounded"
              size="w-72 h-72 md:w-96 md:h-96"
              className="shadow-xl rounded-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

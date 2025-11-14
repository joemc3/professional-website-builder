import React from 'react';
import { Contact as ContactType } from '@/types/portfolio';

interface ContactProps {
  contact: ContactType;
}

export default function Contact({ contact }: ContactProps) {
  return (
    <section id="contact" className="bg-serene-900">
      <div className="section-container">
        <h2 className="section-title text-center text-gray-800">Get In Touch</h2>
        <div className="max-w-2xl mx-auto">
          <p className="text-lg text-gray-700 text-center mb-8">
            I&apos;m always open to discussing new projects, creative ideas, or
            opportunities to be part of your vision.
          </p>
          <div className="flex flex-col items-center space-y-6">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="text-xl text-accent-teal-serene hover:text-teal-600 transition-colors flex items-center"
              >
                <svg
                  className="w-6 h-6 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="text-xl text-accent-teal-serene hover:text-teal-600 transition-colors flex items-center"
              >
                <svg
                  className="w-6 h-6 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {contact.phone}
              </a>
            )}
            {contact.website && (
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl text-accent-teal-serene hover:text-teal-600 transition-colors flex items-center"
              >
                <svg
                  className="w-6 h-6 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
                Website
              </a>
            )}
            {contact.socialLinks && contact.socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-4 mt-4">
                {contact.socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-white text-accent-teal-serene border border-serene-700 hover:border-accent-teal-serene rounded-xl transition-all hover:shadow-lg hover:shadow-teal-500/30"
                  >
                    {social.platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

import React from 'react';

interface HeaderProps {
  fullName: string;
}

export default function Header({ fullName }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-onyx-900/80 backdrop-blur-md border-b border-onyx-700">
      <nav className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold gradient-text">{fullName}</div>
          <ul className="flex space-x-8">
            <li>
              <a
                href="#about"
                className="text-gray-300 hover:text-accent-blue transition-colors"
              >
                About
              </a>
            </li>
            <li>
              <a
                href="#experience"
                className="text-gray-300 hover:text-accent-blue transition-colors"
              >
                Experience
              </a>
            </li>
            <li>
              <a
                href="#projects"
                className="text-gray-300 hover:text-accent-blue transition-colors"
              >
                Projects
              </a>
            </li>
            <li>
              <a
                href="#education"
                className="text-gray-300 hover:text-accent-blue transition-colors"
              >
                Education
              </a>
            </li>
            <li>
              <a
                href="#skills"
                className="text-gray-300 hover:text-accent-blue transition-colors"
              >
                Skills
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="text-gray-300 hover:text-accent-blue transition-colors"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}

import Container from '../components/Container';
import { productName, description, author, version } from '../../package.json';
import { motion } from 'motion/react';

export default function AboutView() {
  const handleExternalLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    url: string,
  ) => {
    event.preventDefault(); // Prevent default <a> tag behavior
    window.electron.openExternalLink(url); // Call the exposed preload function
  };

  return (
    // Add padding like other views and ensure centering
    <div className="flex w-full max-w-4xl">
      {/* Ensure Card takes appropriate width */}
      <Container>
        <h2 className="mb-6 text-xl font-semibold">
          {' '}
          {/* Centered title */}
          About {productName}
        </h2>
        <div className="space-y-4 dark:text-white/80">
          {' '}
          {/* Centered text */}
          <p>{description}</p>
          <p>Built with Electron, React, TypeScript, and Tailwind CSS.</p>
          <p>
            Current Version:{' '}
            <span className="font-medium text-white">{version}</span>
          </p>
        </div>

        {/* Author Section */}
        <div className="mt-8 flex flex-col items-center border-t border-white/10 pt-6">
          {' '}
          {/* Added top border and center alignment */}
          <h3 className="mb-4 text-lg font-medium">Developed by</h3>
          <a
            href={author.avatarUrl}
            onClick={(e) => handleExternalLinkClick(e, author.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center"
          >
            <motion.img
              key="avatar"
              src={author.avatarUrl}
              alt={`Avatar of ${author.name}`}
              className="mb-2 h-20 w-20 rounded-full border-2 border-white/20 transition-colors duration-200 group-hover:border-indigo-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
            <span className="text-md font-semibold text-white transition-colors duration-200 group-hover:text-indigo-400">
              {author.name} ({author.githubUsername})
            </span>
          </a>
          <p className="mt-2 text-sm text-white/60">
            Visit on GitHub for more projects!
          </p>
        </div>
      </Container>
    </div>
  );
}

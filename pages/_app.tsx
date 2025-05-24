import type { AppProps } from 'next/app';
import '../src/styles/globals.css';
import OnchainProviders from '../src/components/OnchainProviders';
import { Buffer } from 'buffer';
import { useEffect } from 'react';

if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
}

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * {
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <OnchainProviders>
      <Component {...pageProps} />
    </OnchainProviders>
  );
}

export default MyApp;
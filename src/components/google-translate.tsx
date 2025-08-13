"use client";

import React, { useEffect } from 'react';

const GoogleTranslate: React.FC = () => {
  useEffect(() => {
    // Check if the script already exists
    if (document.getElementById('google-translate-script')) {
        // @ts-ignore
        if (window.google && window.google.translate) {
             // @ts-ignore
            new window.google.translate.TranslateElement({pageLanguage: 'en', layout: google.translate.TranslateElement.InlineLayout.VERTICAL}, 'google_translate_element');
        }
        return;
    };

    // Define the callback function
    (window as any).googleTranslateElementInit = () => {
      // @ts-ignore
      new window.google.translate.TranslateElement({pageLanguage: 'en', layout: google.translate.TranslateElement.InlineLayout.VERTICAL}, 'google_translate_element');
    };

    // Create the script element
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = `//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit`;
    script.async = true;
    
    // Append the script to the body
    document.body.appendChild(script);

    // Cleanup function to remove the script and the global function
    return () => {
      const existingScript = document.getElementById('google-translate-script');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      delete (window as any).googleTranslateElementInit;
    };
  }, []);

  return <div id="google_translate_element"></div>;
};

export default GoogleTranslate;

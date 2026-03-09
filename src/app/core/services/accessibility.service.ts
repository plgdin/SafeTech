import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private renderer: Renderer2;
  
  // Track active states
  activeStates = {
    contrast: false,
    highlightLinks: false,
    biggerText: false,
    textSpacing: false,
    dyslexia: false,
    hideImages: false
  };

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  toggleFeature(feature: keyof typeof this.activeStates) {
    this.activeStates[feature] = !this.activeStates[feature];
    const className = `a11y-${feature}`;
    
    if (this.activeStates[feature]) {
      this.renderer.addClass(document.body, className);
    } else {
      this.renderer.removeClass(document.body, className);
    }
  }

  changeLanguage(lang: string) {
    // Note: To fully implement this, you'll need to integrate an i18n library like ngx-translate.
    // For now, we'll just log it or apply a data attribute.
    console.log(`Language changed to: ${lang}`);
    this.renderer.setAttribute(document.documentElement, 'lang', lang);
  }
}
export class DeviceChecker {
  constructor() {
    this.hasTouchScreen = false;
    if ("maxTouchPoints" in navigator) {
      this.hasTouchScreen = navigator.maxTouchPoints > 0;
    } 
    else if ("msMaxTouchPoints" in navigator) {
        this.hasTouchScreen = navigator.msMaxTouchPoints > 0;
    }
    else {
      var mQ = window.matchMedia && matchMedia("(pointer:coarse)");
      if (mQ && mQ.media === "(pointer:coarse)") {
          this.hasTouchScreen = !!mQ.matches;
      } else if ('orientation' in window) {
          this.hasTouchScreen = true; // deprecated, but good fallback
      } else {
          // Only as a last resort, fall back to user agent sniffing
          var UA = navigator.userAgent;
          hasTouchScreen = (
              /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
              /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
          );
      }
    }
  }

  isMobile() 
  {
    return this.hasTouchScreen;
  }
}




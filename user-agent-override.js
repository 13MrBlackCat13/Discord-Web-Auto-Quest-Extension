(function() {
  'use strict';

  const electronUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9269 Chrome/152.0.7977.169 Electron/44.10.2 Safari/537.36';
  const electronAppVersion = electronUserAgent.replace(/^Mozilla\//, '');

  try {
    Object.defineProperty(navigator, 'userAgent', {
      get: function() {
        return electronUserAgent;
      },
      configurable: true
    });

    Object.defineProperty(navigator, 'appVersion', {
      get: function() {
        return electronAppVersion;
      },
      configurable: true
    });

    Object.defineProperty(navigator, 'platform', {
      get: function() {
        return 'Win32';
      },
      configurable: true
    });

    if ('userAgentData' in navigator) {
      const uaData = {
        brands: [
          { brand: 'Not?A_Brand', version: '24' },
          { brand: 'Chromium', version: '152' }
        ],
        mobile: false,
        platform: 'Windows',
        getHighEntropyValues: function() {
          return Promise.resolve({
            brands: uaData.brands,
            mobile: false,
            platform: 'Windows',
            platformVersion: '10.0.26300',
            architecture: 'x86',
            bitness: '64',
            fullVersionList: [
              { brand: 'Not?A_Brand', version: '24.0.0.0' },
              { brand: 'Chromium', version: '152.0.7977.169' }
            ],
            model: '',
            uaFullVersion: '152.0.7977.169'
          });
        },
        toJSON: function() {
          return { brands: this.brands, mobile: this.mobile, platform: this.platform };
        }
      };

      Object.defineProperty(navigator, 'userAgentData', {
        get: function() {
          return uaData;
        },
        configurable: true
      });
    }

    console.info('[Discord Auto Quest] User-Agent override active:', electronUserAgent);
  } catch (error) {
    console.error('[Discord Auto Quest] Failed to override user agent:', error);
  }
})();

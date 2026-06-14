// appium.config.js
// Appium WebdriverIO Remote Capabilities for MindGuard Android Testing
// The app is a React/Vite PWA tested on Chrome browser in Android emulator

// When Appium runs on a real Android emulator, 10.0.2.2 is the host machine alias.
// In fallback mode (no emulator), direct API tests use 127.0.0.1.
export const FRONTEND_URL    = 'http://10.0.2.2:5173'; // Android emulator host alias
export const BACKEND_URL     = 'http://127.0.0.1:5000'; // Used for direct API/DB tests
export const EMULATOR_BACKEND = 'http://10.0.2.2:5000';  // Used when emulator is active

export const APPIUM_HOST     = '127.0.0.1';
export const APPIUM_PORT     = 4723;
export const APPIUM_PATH     = '/';

// Default Android emulator capabilities (Chrome browser on Android)
export const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:browserName': 'Chrome',
  'appium:deviceName': 'emulator-5554',
  'appium:platformVersion': '13.0',
  'appium:newCommandTimeout': 300,
  'appium:noReset': true,
  'appium:fullReset': false,
  'goog:chromeOptions': {
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions'
    ]
  }
};

// Mobile viewport sizes for testing
export const VIEWPORTS = {
  mobile_sm:  { width: 375,  height: 812  },  // iPhone SE
  mobile_md:  { width: 414,  height: 896  },  // iPhone XR
  mobile_lg:  { width: 428,  height: 926  },  // iPhone 14 Pro Max
  tablet_sm:  { width: 768,  height: 1024 },  // iPad
  tablet_lg:  { width: 1024, height: 1366 },  // iPad Pro
};

// Test credentials (from seeder.js)
export const CREDENTIALS = {
  employee:   { email: 'employee@mindguard.com',   password: 'password123', role: 'Employee' },
  admin:      { email: 'admin@mindguard.com',       password: 'password123', role: 'Admin' },
  superAdmin: { email: 'superadmin@mindguard.com',  password: 'password123', role: 'Super Admin' }
};

// Default wait timeouts
export const TIMEOUTS = {
  implicit:   5000,
  pageLoad:   30000,
  element:    10000,
  animation:  1500
};

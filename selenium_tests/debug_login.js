import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('../backend/.env') });
const CLIENT_URL = 'http://localhost:5173';

async function debug() {
  console.log('--- Initializing Headless Chrome Debug Session ---');
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    console.log('Navigating to login page:', `${CLIENT_URL}/login`);
    await driver.get(`${CLIENT_URL}/login`);
    await driver.sleep(2000);

    console.log('Page Title:', await driver.getTitle());
    console.log('Current URL:', await driver.getCurrentUrl());

    // Check if fields are visible
    const emailInput = await driver.findElement(By.css('input[type="email"]'));
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));

    console.log('Email visible:', await emailInput.isDisplayed());
    console.log('Password visible:', await passwordInput.isDisplayed());
    console.log('Submit button visible:', await submitBtn.isDisplayed());

    await emailInput.sendKeys('employee@mindguard.com');
    await passwordInput.sendKeys('password123');
    console.log('Credentials entered.');

    console.log('Clicking Sign In...');
    await submitBtn.click();
    console.log('Submit button clicked. Waiting 5 seconds...');
    await driver.sleep(5000);

    console.log('URL after wait:', await driver.getCurrentUrl());
    
    // Check if error box is present
    try {
      const errorBox = await driver.findElement(By.xpath("//div[contains(@class, 'bg-red-50') or contains(., 'Invalid') or contains(., 'password')]"));
      console.log('Error alert text found:', await errorBox.getText());
    } catch (_) {
      console.log('No error alert element found on screen.');
    }

    // Inspect browser console logs
    console.log('\n--- Browser Console Logs ---');
    const logs = await driver.manage().logs().get('browser');
    logs.forEach(log => {
      console.log(`[Console][${log.level.name}] ${log.message}`);
    });

  } catch (err) {
    console.error('Error during debug session:', err);
  } finally {
    await driver.quit();
    console.log('Browser session closed.');
  }
}

debug();

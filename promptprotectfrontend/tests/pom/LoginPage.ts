import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) { }

  async goto() {
    await this.page.goto('/');
    // Wait for the workspace input to be visible instead of networkidle
    await this.page.waitForSelector('input[placeholder*="acme_corp"]', { state: 'visible', timeout: 15000 });
  }

  async enterWorkspace(workspace: string) {
    await this.page.fill('input[placeholder*="acme_corp"]', workspace);
    await this.page.click('button:has-text("Continue")');
  }

  async enterCredentials(email: string, pass: string) {

    // Step 3: Credentials
    await this.page.waitForSelector('input[placeholder*="name@company.com"]', { state: 'visible', timeout: 5000 });
    await this.page.fill('input[placeholder*="name@company.com"]', email);
    await this.page.fill('input[placeholder*="Enter your password"]', pass);
    await this.page.click('button:has-text("Sign in")');

    // Allow more time for dashboard redirect
    await expect(this.page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  }

  async login(workspace: string, email: string, pass: string) {
    await this.page.goto('/');
    await this.enterWorkspace(workspace);
    await this.enterCredentials(email, pass);
  }

  async signup(org: string, workspace: string, name: string, email: string, pass: string) {
    // Step 0: Switch to signup mode
    const signUpBtn = this.page.locator('button:text-is("Sign up")');
    await signUpBtn.waitFor({ state: 'visible', timeout: 10000 });
    await signUpBtn.click();

    // Step 1: Org Info
    await this.page.waitForSelector('input[placeholder*="Acme Security"]', { state: 'visible', timeout: 5000 });
    await this.page.fill('input[placeholder*="Acme Security"]', org);
    await this.page.fill('input[placeholder*="acme_corp"]', workspace);
    await this.page.click('button:has-text("Continue")');

    // Step 2: Admin Info
    await this.page.waitForSelector('input[placeholder*="First admin user"]', { state: 'visible', timeout: 5000 });
    await this.page.fill('input[placeholder*="First admin user"]', name);
    await this.page.fill('input[placeholder*="name@company.com"]', email);
    await this.page.fill('input[placeholder*="Create a strong password"]', pass);
    await this.page.click('button:has-text("Complete signup")');

    // We expect the "Account created" message
    try {
      await expect(this.page.locator('text=Account created')).toBeVisible({ timeout: 15000 });
    } catch (e) {
      const errorMsg = await this.page.locator('div.text-red-200').innerText().catch(() => 'Unknown error');
      throw new Error(`Signup failed: ${errorMsg}`);
    }
  }
}

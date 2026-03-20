import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) { }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async verifyDashboardLoaded() {
    await expect(this.page.locator('text=Prompt Protect').first()).toBeVisible();
    await expect(this.page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible();
  }

  async navigateTo(section: string) {
    const nav = this.page.locator('nav');
    await nav.getByRole('button', { name: section, exact: false }).first().click();
    await this.page.waitForTimeout(500);
  }

  async logout() {
    const menuButton = this.page.locator('button[aria-haspopup="menu"]').first();
    await menuButton.click();

    const signOutButton = this.page.locator('button:has-text("Sign Out")');
    await expect(signOutButton).toBeVisible({ timeout: 5000 });
    await signOutButton.click();

    await expect(this.page).toHaveURL(/\/$/);
  }

  async verifyKeySectionVisible() {
    await this.navigateTo('Key');
    await expect(this.page.locator('text=Organization Key')).toBeVisible();
    // Allow for hex keys or masked bullets
    const keyContainer = this.page.locator('div.font-mono, .truncate, .text-slate-200');
    await expect(keyContainer.first()).toContainText(/[0-9a-f]{20,}|•{10,}/i);
  }

  async listSidebarItems(): Promise<string[]> {
    const nav = this.page.locator('nav');
    return await nav.locator('button span.flex-1').allInnerTexts();
  }

  async verifyUrlAccessible(url: string) {
    await this.page.goto(url);
    // Check if we are still on that URL (not redirected to / or /dashboard)
    // and no access denied popup is shown
    await expect(this.page).toHaveURL(new RegExp(url));
    await expect(this.page.locator('text=Access denied')).not.toBeVisible();
  }

  async verifyAccessDenied(url: string) {
    await this.page.goto(url);
    // Expect a popup or redirect with access denied
    await expect(this.page.locator('text=Access denied')).toBeVisible();
  }

  async verifySidebarVisibility(expected: string[], forbidden: string[]) {
    const nav = this.page.locator('nav');
    for (const item of expected) {
      await expect(nav.locator(`button:has-text("${item}")`)).toBeVisible();
    }
    for (const item of forbidden) {
      await expect(nav.locator(`button:has-text("${item}")`)).not.toBeVisible();
    }
  }
}

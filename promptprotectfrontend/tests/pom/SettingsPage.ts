import { Page, expect } from '@playwright/test';

export class SettingsPage {
  constructor(private page: Page) { }

  async gotoAuth() {
    await this.page.goto('/dashboard/settings/auth');
  }


  async saveConfiguration() {
    await this.page.click('button:has-text("Save Configuration")');
    await expect(this.page.getByText('Settings updated successfully')).toBeVisible({ timeout: 10000 });
  }
}

import { Page, expect } from '@playwright/test';

export class UsersPage {
  constructor(private page: Page) { }

  async goto() {
    await this.page.goto('/dashboard/users');
  }

  async createUser(name: string, email: string, role: string = 'DEFAULT') {
    // 1. Click the main "Add User" button
    await this.page.click('button:has-text("Add User")');

    // 2. Fill form in modal (using H2 heading for precision)
    const modal = this.page.locator('div.fixed.inset-0').filter({ has: this.page.locator('h2:has-text("Add User")') });
    await modal.locator('input[placeholder="Full name"]').fill(name);
    await modal.locator('input[placeholder="name@company.com"]').fill(email);
    await modal.locator('input[placeholder="Set a strong password"]').fill('Password123!');

    // 3. Select Role
    // The role list in the app is uppercase: ADMIN, USER_MANAGER, etc.
    await modal.locator('button:has-text("Select roles...")').click();
    await this.page.locator('role=listbox').locator(`button:has-text("${role}")`).click();
    // Click outside or press Escape to close the dropdown if needed, 
    // but typically clicking an option might not close it in MultiSelect.
    // However, our MultiSelectDropdown.tsx toggleSelect doesn't close on click.
    // Let's press Escape to be safe.
    await this.page.keyboard.press('Escape');

    // 4. Click the submit button inside the modal
    await modal.locator('button:has-text("Add User")').click();
    await modal.waitFor({ state: 'hidden', timeout: 5000 });

    await expect(this.page.locator(`text=${name}`)).toBeVisible();
  }

  async deleteUser(name: string) {
    const row = this.page.locator('tr', { hasText: name });
    await row.locator('button:has-text("Delete")').click();
    // Modal confirmation
    // Modal confirmation - wait for the modal to appear (it lacks role="dialog")
    const modal = this.page.locator('div.fixed', { hasText: 'Confirm Delete' });
    await modal.locator('button:has-text("Delete")').click();
    await expect(this.page.locator(`text=${name}`)).not.toBeVisible();
  }
}

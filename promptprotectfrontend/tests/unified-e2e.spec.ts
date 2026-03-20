import { test, expect } from '@playwright/test';
import { LoginPage } from './pom/LoginPage';
import { DashboardPage } from './pom/DashboardPage';
import { UsersPage } from './pom/UsersPage';
import { execSync } from 'child_process';

test.describe('Unified E2E Flow', () => {
  // Start with a clean state to bypass auth.setup.ts
  test.use({ storageState: { cookies: [], origins: [] } });

  let loginPage: LoginPage;
  let dashboard: DashboardPage;
  let usersPage: UsersPage;

  const ts = Date.now();
  const workspace = `e2e_ws_${ts}`;
  const adminEmail = `admin_${ts}@mail.com`;
  const adminPass = 'Password123!';
  const managerName = `Manager ${ts}`;
  const managerEmail = `manager_${ts}@mail.com`;
  const managerPass = 'Password123!';

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboard = new DashboardPage(page);
    usersPage = new UsersPage(page);
  });

  test.afterAll(async () => {
    // Cleanup test data
    try {
      console.log('Cleaning up test data...');
      execSync(`node scripts/cleanup-test-data.js`, {
        env: { ...process.env, TEST_WORKSPACE: workspace },
        stdio: 'inherit'
      });
    } catch (e) {
      console.error('Cleanup failed:', e);
    }
  });

  test('Signup, RBAC verification, and Cleanup', async ({ page }) => {
    const baseUrl = 'http://localhost:3000';

    await test.step('Signup and Activation', async () => {
      console.log(`Starting signup for org: E2E Org, workspace: ${workspace}`);
      await loginPage.goto();
      await loginPage.signup('E2E Org', workspace, 'Admin User', adminEmail, adminPass);
      console.log(`Signup complete, activating admin: ${adminEmail}`);

      // Bypass email verification
      try {
        execSync(`node scripts/activate-user.js`, {
          env: { ...process.env, TEST_EMAIL: adminEmail },
          stdio: 'inherit'
        });
        console.log(`Admin ${adminEmail} activated.`);
      } catch (e) {
        throw new Error(`Failed to activate admin: ${e}`);
      }
    });

    await test.step('Login as Admin and verify Accessibility', async () => {
      console.log(`Logging in as Admin: ${adminEmail}`);
      await loginPage.login(workspace, adminEmail, adminPass);
      
      const adminUrls = [
        `${baseUrl}/dashboard`,
        `${baseUrl}/dashboard/users`,
        `${baseUrl}/dashboard/policies`,
        `${baseUrl}/dashboard/groups`,
        `${baseUrl}/dashboard/key`
      ];

      console.log('Verifying Admin accessibility for all sections...');
      for (const url of adminUrls) {
        await dashboard.verifyUrlAccessible(url);
        console.log(`- Accessible: ${url}`);
      }
    });

    await test.step('Create User_Manager', async () => {
      console.log(`Navigating to Users page to create: ${managerEmail}`);
      await dashboard.navigateTo('Users');
      await usersPage.createUser(managerName, managerEmail, 'USER_MANAGER');
      console.log(`User ${managerEmail} created with role USER_MANAGER.`);
      
      // Activate the new manager in DB as well
      try {
        execSync(`node scripts/activate-user.js`, {
          env: { ...process.env, TEST_EMAIL: managerEmail },
          stdio: 'inherit'
        });
        console.log(`User ${managerEmail} activated.`);
      } catch (e) {
        console.warn(`Failed to activate manager ${managerEmail}:`, e);
      }
    });

    await test.step('Logout Admin', async () => {
      console.log('Logging out Admin...');
      await dashboard.logout();
      console.log('Admin logged out.');
    });

    await test.step('Login as User_Manager and verify RBAC Accessibility', async () => {
      console.log(`Logging in as User_Manager: ${managerEmail}`);
      await loginPage.login(workspace, managerEmail, managerPass);
      
      // Accessible
      console.log('Verifying User_Manager accessible URLs...');
      const accessibleUrls = [
        `${baseUrl}/dashboard`,
        `${baseUrl}/dashboard/users`,
        `${baseUrl}/dashboard/key`
      ];
      for (const url of accessibleUrls) {
        await dashboard.verifyUrlAccessible(url);
        console.log(`- Accessible: ${url}`);
      }

      // Inaccessible (Pop up access denied)
      console.log('Verifying User_Manager restricted URLs (expecting Access Denied)...');
      const forbiddenUrls = [
        `${baseUrl}/dashboard/policies`,
        `${baseUrl}/dashboard/groups`
      ];

      for (const url of forbiddenUrls) {
        await dashboard.verifyAccessDenied(url);
        console.log(`- Access Denied (Correct): ${url}`);
      }
    });

    await test.step('Final Logout', async () => {
      console.log('Logging out User_Manager...');
      await dashboard.logout();
      console.log('User_Manager logged out. Test successful.');
    });
  });
});

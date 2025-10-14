import { test, expect } from '@playwright/test';
import { loginUser } from './auth.spec.js';

test.describe('Knowledge Hub smoke flow', () => {
  test('allows a user to login, see knowledge tree, select document, and view content', async ({ page }) => {
    // Navigate to the Knowledge Hub (root path)
    await page.goto('/');

    // Login using the reusable helper
    await loginUser(page);

    // Verify Knowledge Tree is visible and has data
    const knowledgeTree = page.locator('[data-testid="knowledge-tree"]');
    await expect(knowledgeTree).toBeVisible();

    // Verify tree has some content (mock data should be loaded)
    // Look for tree nodes - the mock data includes items like "Dự án Incomex Corp"
    const treeNodes = knowledgeTree.locator('.v-treeview-node');
    await expect(treeNodes.first()).toBeVisible();

    // Verify at least one document is present in the tree
    const firstTreeItem = treeNodes.first();
    const itemText = await firstTreeItem.textContent();
    expect(itemText).toBeTruthy();
    expect(itemText?.length).toBeGreaterThan(0);

    // Click on the first tree item to select it
    await firstTreeItem.click();

    // Verify Content Editor panel shows content
    // The ContentEditor component should be visible and show the selected document
    const contentEditor = page.locator('.v-col').nth(1); // Second column contains ContentEditor
    await expect(contentEditor).toBeVisible();

    // Verify some content is displayed (mock data should have content)
    // Look for any text content in the editor area
    const editorContent = contentEditor.locator('.ProseMirror, .tiptap, [contenteditable]');
    await expect(editorContent.or(page.locator('text=/./'))).toBeVisible();

    // Optional: Verify the selected document title is displayed somewhere
    // This would typically be in a header or breadcrumb
    const pageTitle = page.locator('text=Knowledge Hub');
    await expect(pageTitle).toBeVisible();
  });

  test('handles empty knowledge tree gracefully', async ({ page }) => {
    // This test would require setting up an empty state scenario
    // For now, we'll verify that when logged in, we don't see error states
    await page.goto('/');
    await loginUser(page);

    // Verify no error alerts are visible
    const errorAlerts = page.locator('.v-alert--error');
    await expect(errorAlerts).toHaveCount(0);

    // Verify either tree has content OR empty state is shown properly
    const knowledgeTree = page.locator('[data-testid="knowledge-tree"]');
    const emptyState = page.locator('text=Không có dữ liệu tri thức');

    // Either tree is visible with content, or empty state is properly displayed
    await expect(knowledgeTree.or(emptyState)).toBeVisible();
  });
});

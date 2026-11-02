import { test, expect } from '@playwright/test';
test('explore morph, focus, search, history and health',async({page})=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:'Repository explorer'})).toBeVisible();
  await page.getByRole('button',{name:'Layers',exact:true}).click();await expect(page.getByRole('button',{name:'Layers',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Cloud',exact:true}).click();
  await page.getByRole('button',{name:'Focus apps',exact:true}).click();await expect(page.getByRole('button',{name:'Exit focus'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Exit focus'})).not.toBeVisible();
  await page.getByRole('searchbox',{name:'Search repository'}).fill('session');
  await page.getByRole('button',{name:/session/}).first().click();await expect(page.getByRole('complementary',{name:'Inspector'})).toBeVisible();
  const sha=await page.getByTestId('commit-sha').textContent();await page.getByRole('button',{name:'Previous commit'}).click();await expect(page.getByTestId('commit-sha')).not.toHaveText(sha!);
  await page.getByRole('button',{name:'Repository health'}).click();await expect(page.getByText('heuristic-v1',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Pipelines',exact:true}).click();await expect(page.getByText('Workflow jobs')).toBeVisible();
});
test('validates repository input without leaving the current graph',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Open repository'}).click();await page.getByLabel('Repository URL').fill('https://example.com/a/b');await page.getByRole('button',{name:'Analyze repository'}).click();await expect(page.getByRole('alert')).toContainText('github.com');
});
test('mobile and reduced motion retain navigable data',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:'Toggle files'}).click();await expect(page.getByRole('complementary',{name:'Files'})).toBeVisible();await page.getByRole('button',{name:'Close files'}).click();await page.getByRole('button',{name:'Layers',exact:true}).click();await expect(page.getByRole('button',{name:'Layers',exact:true})).toHaveAttribute('aria-pressed','true');
});

#!/usr/bin/env python3
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1400, "height": 900})
        page = await context.new_page()
        
        print("Going to login page...")
        await page.goto("http://localhost:3000/login", wait_until="networkidle", timeout=15000)
        print(f"URL: {page.url}")
        await page.screenshot(path="/tmp/xedu-audit/login.png")
        
        print("Filling form...")
        await page.fill('input[type="email"]', "super@eduplatform.uz")
        await page.fill('input[type="password"]', "SuperAdmin123!")
        
        print("Clicking submit...")
        await page.click('button[type="submit"]')
        
        print("Waiting for sidebar nav...")
        try:
            await page.wait_for_selector("aside a[href]", timeout=8000)
        except Exception as e:
            print(f"Selector wait failed: {e}")
        
        await page.wait_for_load_state("networkidle", timeout=10000)
        await asyncio.sleep(3)
        
        print(f"After login URL: {page.url}")
        await page.screenshot(path="/tmp/xedu-audit/super_dashboard.png", full_page=True)
        
        # Get nav items with href
        items = await page.eval_on_selector_all("aside a[href]", """
            els => els.map(e => ({
                text: e.innerText.trim(),
                href: e.getAttribute('href')
            }))
        """)
        print(f"Nav items: {items}")
        
        # Also try all links in aside
        all_links = await page.eval_on_selector_all("aside a", """
            els => els.map(e => ({
                text: e.innerText.trim(),
                href: e.getAttribute('href'),
                html: e.outerHTML.slice(0, 200)
            }))
        """)
        print(f"All aside links: {all_links}")
        
        await browser.close()
        print("Done")

if __name__ == "__main__":
    asyncio.run(main())

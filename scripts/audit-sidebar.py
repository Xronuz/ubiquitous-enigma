#!/usr/bin/env python3
"""
RBAC & Sidebar Audit Script — Optimized
"""

import asyncio
import json
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3000"
OUTPUT_DIR = "/tmp/xedu-audit"

ACCOUNTS = [
    ("super_admin", "super@eduplatform.uz", "SuperAdmin123!"),
    ("branch_admin", "branchadmin@demo-school.uz", "BranchAdmin123!"),
    ("director", "director@demo-school.uz", "Director123!"),
    ("vice_principal", "vice@demo-school.uz", "Vice123!"),
    ("teacher", "teacher@demo-school.uz", "Teacher123!"),
    ("class_teacher", "classteacher@demo-school.uz", "ClassTeacher123!"),
    ("accountant", "accountant@demo-school.uz", "Accountant123!"),
    ("librarian", "librarian@demo-school.uz", "Librarian123!"),
    ("student", "student@demo-school.uz", "Student123!"),
    ("parent", "parent@demo-school.uz", "Parent123!"),
]

RESTRICTED_URLS = [
    "/dashboard/finance",
    "/dashboard/staff",
    "/dashboard/users",
    "/dashboard/discipline",
    "/dashboard/reports",
    "/dashboard/attendance/bulk",
    "/dashboard/student/shop",
    "/dashboard/parent",
    "/dashboard/student",
    "/dashboard/onboarding",
    "/dashboard/settings",
]

async def audit_role(role: str, email: str, password: str, browser):
    context = await browser.new_context(viewport={"width": 1400, "height": 900})
    page = await context.new_page()
    
    try:
        # Login
        await page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=15000)
        await page.fill('input[type="email"]', email)
        await page.fill('input[type="password"]', password)
        await page.click('button[type="submit"]')
        await page.wait_for_load_state("networkidle", timeout=10000)
        await asyncio.sleep(2)
        
        # Screenshot
        await page.screenshot(path=f"{OUTPUT_DIR}/{role}_dashboard.png", full_page=False)
        
        # Extract nav items from title attributes (sidebar may be collapsed)
        items = await page.eval_on_selector_all("aside nav a[href], aside a[href]", """
            els => els.map(e => ({
                label: e.getAttribute('title') || e.innerText.trim() || '',
                href: e.getAttribute('href'),
                active: e.className.includes('text-emerald-700') || e.className.includes('bg-emerald')
            })).filter(i => i.label && i.href && i.href.startsWith('/dashboard'))
        """)
        
        # Deduplicate by href
        seen = set()
        unique_items = []
        for i in items:
            if i['href'] not in seen:
                seen.add(i['href'])
                unique_items.append(i)
        
        # Extract section labels
        sections = await page.eval_on_selector_all("aside p", "els => els.map(e => e.innerText.trim()).filter(Boolean)")
        
        result = {
            "role": role,
            "email": email,
            "nav_items": unique_items,
            "sections": sections,
            "url_after_login": page.url,
        }
        
        # Check restricted URLs quickly
        for url_path in RESTRICTED_URLS:
            try:
                await page.goto(f"{BASE_URL}{url_path}", wait_until="domcontentloaded", timeout=8000)
                await asyncio.sleep(0.5)
                current = page.url
                result.setdefault("restricted_checks", {})[url_path] = {
                    "landed": current == f"{BASE_URL}{url_path}",
                    "redirected_to": current if current != f"{BASE_URL}{url_path}" else None,
                    "title": await page.title(),
                }
            except Exception as e:
                result.setdefault("restricted_checks", {})[url_path] = {"error": str(e)[:80]}
        
        print(f"✅ {role}: {len(unique_items)} nav items")
        return result
        
    except Exception as e:
        print(f"❌ {role}: {e}")
        await page.screenshot(path=f"{OUTPUT_DIR}/{role}_error.png")
        return {"role": role, "error": str(e)}
    finally:
        await context.close()

async def main():
    import os
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        results = []
        for role, email, pwd in ACCOUNTS:
            result = await audit_role(role, email, pwd, browser)
            results.append(result)
        
        await browser.close()
    
    report_path = f"{OUTPUT_DIR}/audit_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n🎉 Audit complete: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())

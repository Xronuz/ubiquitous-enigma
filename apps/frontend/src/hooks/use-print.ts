'use client';

import { useCallback, useRef } from 'react';

/**
 * usePrint — HTML elementni PDF sifatida chop etish
 *
 * @example
 * const { printRef, handlePrint } = usePrint({ title: 'Baholar hisoboti' });
 * <div ref={printRef}> ... </div>
 * <button onClick={handlePrint}>PDF yuklash</button>
 */
export function usePrint(opts: { title?: string } = {}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const el = printRef.current;
    if (!el) return;

    const title = opts.title ?? document.title;
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; }

      /* Page setup */
      @page {
        size: A4 landscape;
        margin: 12mm 10mm;
      }

      /* Header */
      .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
      .print-header h1 { font-size: 16px; font-weight: 700; color: #6366f1; }
      .print-header .meta { font-size: 10px; color: #666; text-align: right; }

      /* Table */
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      thead tr { background: #6366f1; color: #fff; }
      th { padding: 5px 8px; text-align: left; font-weight: 600; font-size: 10px; white-space: nowrap; }
      td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; vertical-align: middle; }
      tbody tr:nth-child(even) { background: #f9fafb; }
      tbody tr:hover { background: #f3f4f6; }
      tfoot td { font-weight: 700; background: #f3f4f6; border-top: 2px solid #d1d5db; }

      /* Badges */
      .badge { display: inline-block; padding: 1px 6px; border-radius: 9999px; font-size: 9px; font-weight: 700; }
      .badge-green { background: #dcfce7; color: #166534; }
      .badge-yellow { background: #fef9c3; color: #854d0e; }
      .badge-orange { background: #ffedd5; color: #9a3412; }
      .badge-red { background: #fee2e2; color: #991b1b; }

      /* KPI cards */
      .kpi-row { display: flex; gap: 12px; margin-bottom: 14px; }
      .kpi-card { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; }
      .kpi-card .kpi-value { font-size: 20px; font-weight: 700; color: #6366f1; }
      .kpi-card .kpi-label { font-size: 9px; color: #666; margin-top: 2px; }

      /* Charts placeholder */
      .no-print { display: none !important; }
      .print-only { display: block !important; }

      /* Footer */
      .print-footer { margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="uz">
      <head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <style>${styles}</style>
      </head>
      <body>
        <div class="print-header">
          <h1>${title}</h1>
          <div class="meta">
            <div>EduPlatform</div>
            <div>${new Date().toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
        ${el.innerHTML}
        <div class="print-footer">
          <span>EduPlatform — Maktab boshqaruv tizimi</span>
          <span>Chop etildi: ${new Date().toLocaleString('uz-UZ')}</span>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) return;

    win.document.write(html);
    win.document.close();
    win.focus();

    // Shriftlar yuklanguncha kuting
    setTimeout(() => {
      win.print();
      win.close();
    }, 600);
  }, [opts.title]);

  return { printRef, handlePrint };
}

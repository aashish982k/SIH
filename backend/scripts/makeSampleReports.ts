/**
 * Writes realistic (fictional) report PDFs to sample-reports/ for the upload demo.
 * They are NOT loaded into the database — upload them through the Reports page.
 */
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const OUT = path.join(__dirname, '..', 'sample-reports');
fs.mkdirSync(OUT, { recursive: true });

function report(file: string, title: string, meta: string[], sections: Array<{ heading: string; body: string[] }>) {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  doc.pipe(fs.createWriteStream(path.join(OUT, file)));
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#555').text('OIL INDIA LIMITED · FICTIONAL SAMPLE FOR NWIS DEMO', { align: 'right' });
  doc.moveDown(1.5).fillColor('#000').fontSize(18).text(title);
  doc.moveDown(0.4).font('Helvetica').fontSize(10).fillColor('#333');
  meta.forEach((m) => doc.text(m));
  for (const s of sections) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000').text(s.heading);
    doc.moveDown(0.6).font('Helvetica').fontSize(10.5).fillColor('#111');
    s.body.forEach((p) => { doc.text(p, { align: 'justify' }); doc.moveDown(0.6); });
  }
  doc.end();
}

report('WCR_NHK-38_sample.pdf', 'Well Completion Report — NHK-38', [
  'Field: Naharkatia · Block: Upper Assam — Block A', 'Well type: Development (vertical)', 'Spud: 14-Feb-2025 · Rig released: 30-Mar-2025', 'Final depth: 3,712 m MD',
], [
  { heading: '1. Summary of drilling', body: [
    'The well was drilled in four phases using 17-1/2", 12-1/4" and 8-1/2" hole sizes. 13-3/8" casing was set at 1,065 m and 9-5/8" casing at 2,448 m, just above the top of the Barail Coal-Shale.',
    'Formation tops encountered: Girujan Clay 1,118 m; Tipam Sandstone 1,941 m; Barail Coal-Shale 2,512 m; Barail Arenaceous 2,851 m; Kopili 3,186 m; Sylhet Limestone 3,431 m.',
  ] },
  { heading: '2. Drilling complications', body: [
    'Partial losses of 45 bbl/hr were observed at 2,395 m while drilling the lower Tipam Sandstone. Pumped 60 bbl LCM pill with 40 ppb calcium carbonate and mica and reduced flow rate. Losses cured after 5 hours and drilling resumed. NPT 6.5 hours.',
    'While making a connection at 2,541 m in the Barail Coal-Shale, the string got differentially stuck. Torque had been rising and erratic for the previous stand, with 35 klbs overpull on the last connection. Spotted 40 bbl pipe-lax pill around the BHA, soaked for 6 hours and jarred down. Pipe freed after 14 hours; resumed drilling. NPT 18 hours.',
    'Heavy splintery cavings were seen on the shakers from 2,590 m in the Barail Coal-Shale. Mud weight was raised from 10.2 to 10.7 ppg and glycol was added for inhibition. Cavings reduced within one circulation.',
  ] },
  { heading: '3. Lessons learned', body: [
    'Pre-treat the active system with LCM before entering the lower Tipam Sandstone. Keep connection times short in the Barail Coal-Shale and watch the torque trend closely; the stuck pipe was preceded by a clear torque increase.',
  ] },
]);

report('DDR_HGR-19_day34_sample.pdf', 'Daily Drilling Report — HGR-19 · Day 34', [
  'Field: Hugrijan · Report date: 11-Jun-2025', 'Depth at 06:00: 3,238 m · Progress: 42 m', 'Mud: KCl-PHPA-glycol WBM, 10.8 ppg',
], [
  { heading: 'Operations summary (00:00–24:00)', body: [
    '00:00–05:30 Drilled 8-1/2" hole in Kopili from 3,196 m to 3,221 m. Background gas increased from 18 to 140 units with connection gas of 260 units. Corrected d-exponent trend reversed at 3,205 m indicating a pressure transition.',
    '05:30–07:00 Observed pit gain of 12 bbl and flow-out increase at 3,226 m. Shut in the well. SIDPP 380 psi, SICP 520 psi.',
    '07:00–15:30 Killed the well by wait-and-weight method with 11.6 ppg kill mud. Circulated out the influx; well static. NPT 8.5 hours.',
    '15:30–24:00 Resumed drilling with 11.6 ppg mud to 3,238 m. No further gains.',
  ] },
  { heading: 'Remarks', body: ['Offset wells in Hugrijan show overpressure in the middle Kopili. Recommend raising mud weight before 3,190 m on future wells.'] },
]);

console.log(`✅  Sample reports written to ${OUT}`);

import { generateTechnicalReport } from '../src/services/reportService';
import { initSqliteEngine } from '../src/config/db';

async function test() {
  initSqliteEngine();
  console.log('Testing generateTechnicalReport...');
  const res = await generateTechnicalReport({
    report_type: 'INCIDENT_INVESTIGATION',
  });
  console.log('Result:', res.report.file_name, 'Size:', res.report.file_size_bytes);
  console.log('Preview:', res.preview);
}

test().catch(console.error);

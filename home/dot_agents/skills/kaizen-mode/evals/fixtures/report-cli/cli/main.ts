import { runReport } from './report.ts';

const [command, ...args] = process.argv.slice(2);

if (command === 'report') {
  console.log(runReport(args));
} else {
  console.error('usage: usage report [file]');
  process.exit(2);
}

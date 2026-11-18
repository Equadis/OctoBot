import fs from 'node:fs';
import {captureReview,extractCaptureLines} from './base-stat-captures.mjs';
const inputs=process.argv.slice(2);
if(!inputs.length){console.error('Usage: node tools/sim/review-base-stat-captures.mjs <SavedVariables or text file> [more files]');process.exit(1);}
const lines=inputs.flatMap(file=>extractCaptureLines(fs.readFileSync(file,'utf8')));
if(!lines.length){console.error('No OCTOSTAT1 records found.');process.exit(1);}
const report=captureReview(lines);
fs.writeFileSync('base-stat-capture-review.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({candidateRows:report.candidateRows,conflictingRows:report.conflictingRows,rejected:report.rejected.length,promotedRows:0}));
if(report.rejected.length||report.conflictingRows)process.exitCode=1;

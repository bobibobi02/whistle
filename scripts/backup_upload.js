// backup_upload.js - programmatic backup and upload via Node.js
import { exec } from 'child_process';
import AWS from 'aws-sdk';

const s3 = new AWS.S3();

async function backupAndUpload() {
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
  const fileName = `whistle_backup_${timestamp}.sql`;
  const dumpCmd = `pg_dump --format=custom --file=/tmp/${fileName}`;

  console.log('Running db dump...');
  await execPromise(dumpCmd);

  console.log('Uploading to S3...');
  const fileContent = require('fs').readFileSync(`/tmp/${fileName}`);
  await s3.upload({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: fileContent
  }).promise();

  console.log('Upload complete, cleaning up...');
  require('fs').unlinkSync(`/tmp/${fileName}`);
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      console.log(stdout);
      resolve();
    });
  });
}

backupAndUpload().catch(console.error);

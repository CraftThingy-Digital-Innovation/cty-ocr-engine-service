import fs from 'fs';

async function testSyncOcr() {
  console.log('\n=======================================');
  console.log('Testing Synchronous OCR Endpoint...');
  console.log('=======================================');
  
  if (!fs.existsSync('test.png')) {
    console.error('test.png not found. Run "node create-test-image.js" first.');
    return;
  }

  const formData = new FormData();
  const fileBuffer = fs.readFileSync('test.png');
  const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
  formData.append('file', fileBlob, 'test.png');

  try {
    const res = await fetch('http://localhost:3000/api/ocr/sync', {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server returned HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    console.log('Sync OCR result received successfully.');
    console.log('Aggregated Text:\n', data.text);
    console.log('\nLayout Lines with Bounding Boxes:');
    data.lines.forEach((line, index) => {
      console.log(`[Line ${index + 1}] "${line.text}"`);
      console.log(`   Line Box:`, JSON.stringify(line.box));
      line.words.forEach((w, wIdx) => {
        console.log(`     - Word ${wIdx + 1}: "${w.text}" at Box:`, JSON.stringify(w.box));
      });
    });
  } catch (error) {
    console.error('Sync OCR Test Failed:', error.message);
  }
}

async function testAsyncOcr() {
  console.log('\n=======================================');
  console.log('Testing Asynchronous OCR Endpoint...');
  console.log('=======================================');

  if (!fs.existsSync('test.png')) {
    console.error('test.png not found.');
    return;
  }

  const formData = new FormData();
  const fileBuffer = fs.readFileSync('test.png');
  const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
  formData.append('file', fileBlob, 'test.png');

  try {
    const uploadRes = await fetch('http://localhost:3000/api/ocr/upload', {
      method: 'POST',
      body: formData
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed with HTTP ${uploadRes.status}: ${errText}`);
    }

    const uploadData = await uploadRes.json();
    console.log('Upload Response:', uploadData);

    const { jobId } = uploadData;
    if (!jobId) {
      console.error('No jobId returned in response.');
      return;
    }

    console.log(`Polling job status for: ${jobId}...`);
    let completed = false;

    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusRes = await fetch(`http://localhost:3000/api/ocr/status/${jobId}`);
      const job = await statusRes.json();

      console.log(`Poll #${i + 1} - Status: [${job.status}] - Progress: ${job.processed_pages}/${job.total_pages}`);

      if (job.status === 'completed') {
        console.log('\nJob Completed successfully!');
        console.log('Results:');
        job.results.forEach(page => {
          console.log(`--- Page ${page.page} ---`);
          console.log('Page Text:', page.text);
        });
        completed = true;
        break;
      } else if (job.status === 'failed') {
        console.error('Job failed with error:', job.error_message);
        break;
      }
    }

    if (!completed) {
      console.log('Job did not complete within the timeout period.');
    }

  } catch (error) {
    console.error('Async OCR Test Failed:', error.message);
  }
}

async function run() {
  await testSyncOcr();
  await testAsyncOcr();
}

run().catch(console.error);

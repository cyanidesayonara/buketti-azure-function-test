import { app, InvocationContext, Timer } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
const pg = require('pg');

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env["BLOB_CONNECTION_STRING"]);
const containerClient = blobServiceClient.getContainerClient(process.env["BLOB_CONTAINER_NAME"]);

export const bukettiTimerTrigger = async (myTimer: Timer, context: InvocationContext): Promise<void> => {
  const config = {
    host: process.env["POSTGRES_HOST"],
    user: process.env["POSTGRES_USER"],
    password: process.env["POSTGRES_PASSWORD"],
    database: process.env["POSTGRES_DB"],
    port: 5432,
    ssl: true
  };

  const client = new pg.Client(config);

  client.connect(async err => {
    if (err) throw err;
    else {
      await createDatabase(client);
      const rows = await queryDatabase(client);
      await uploadDataToAzure(rows);
    }
  });

  context.log('Timer function processed request.');
};

const uploadDataToAzure = async (data) => {
  const latestBlobFilename = await getLatestBlobFilename();

  if (latestBlobFilename) {
    const latestBlobContent = await getLatestBlobContent(latestBlobFilename);
    if (data != latestBlobContent) {
      console.log("Data has changed, uploading...");
      await uploadData(data);
    } else {
      console.log("Data has not changed, skipping upload...");
    }
  } else {
    console.log("No data in blob storage, uploading...");
    await uploadData(data);
  }
};

const streamToBuffer = async (readableStream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    readableStream.on('error', reject);
  });
};

const getLatestBlobFilename = async () => {
  const blobs = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    blobs.push(blob);
  }
  if (blobs.length) {
    blobs.sort().reverse();
    return blobs[0].name;
  } else {
    return '';
  }
};

const getLatestBlobContent = async (latestBlobFilename) => {
  const blockBlobClient = containerClient.getBlockBlobClient(latestBlobFilename);
  const downloadResponse = await blockBlobClient.download();
  const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
  return downloaded.toString();
};

const uploadData = async (data) => {
  const filename = `uploaded-data-${Math.round(Date.now() / 1000)}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  const response = await blockBlobClient.upload(data, data.length);
  console.log(`Uploaded data ${data} as ${filename}`);

  if (response._response.status !== 201) {
    throw new Error(
      `Error uploading document ${blockBlobClient.name} to container ${blockBlobClient.containerName}`
    );
  }
};

const createDatabase = async (client) => {
  let query;
  // ~50-50 chance of values changing (triggers blob storage update)
  if (Math.random() < 0.5) {
    query = `
      DROP TABLE IF EXISTS inventory;
      CREATE TABLE inventory (id serial PRIMARY KEY, name VARCHAR(50), quantity INTEGER);
      INSERT INTO inventory (name, quantity) VALUES ('bananas', 123);
      INSERT INTO inventory (name, quantity) VALUES ('apples', 456);
      INSERT INTO inventory (name, quantity) VALUES ('oranges', 789);
    `;
  } else {
    const bananas = Math.floor(Math.random() * 100);
    const apples = Math.floor(Math.random() * 100);
    const oranges = Math.floor(Math.random() * 100);
    query = `
      DROP TABLE IF EXISTS inventory;
      CREATE TABLE inventory (id serial PRIMARY KEY, name VARCHAR(50), quantity INTEGER);
      INSERT INTO inventory (name, quantity) VALUES ('bananas', ${bananas});
      INSERT INTO inventory (name, quantity) VALUES ('apples', ${apples});
      INSERT INTO inventory (name, quantity) VALUES ('oranges', ${oranges});
    `;
  }

  await client
    .query(query)
    .catch(err => console.log(err));

  query = 'SELECT * FROM inventory;';
  return await client.query(query)
    .then(res => {
      const data = JSON.stringify(res.rows);
      console.log(`Table created with data ${data}`);
    })
    .catch(err => {
      console.log(err);
    });
};

const queryDatabase = async (client) => {
  console.log(`Running query to PostgreSQL server`);
  const query = 'SELECT * FROM inventory;';
  return await client.query(query)
    .then(res => {
      const data = JSON.stringify(res.rows);
      console.log(`Found data ${data}`);
      return data;
    })
    .catch(err => {
      console.log(err);
    });
};

app.timer('bukettiTimerTrigger', {
  schedule: process.env["CRON_SCHEDULE"],
  handler: bukettiTimerTrigger
});

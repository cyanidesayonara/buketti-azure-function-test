import { app, InvocationContext, Timer } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { v4 } from 'uuid';
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
      // createDatabase(client);
      const rows = await queryDatabase(client);
      await uploadDataToAzure(rows);
    }
  });

  context.log('Timer function processed request.');
};

const uploadDataToAzure = async (data) => {
  const filename = `uploaded-data-${v4()}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  const response = await blockBlobClient.upload(data, data.length);
  console.log(`Uploaded data ${data} as ${filename}`);
  if (response._response.status !== 201) {
    throw new Error(
      `Error uploading document ${blockBlobClient.name} to container ${blockBlobClient.containerName}`
    );
  }
};

// const createDatabase = (client) => {
//   const query = `
//     DROP TABLE IF EXISTS inventory;
//     CREATE TABLE inventory (id serial PRIMARY KEY, name VARCHAR(50), quantity INTEGER);
//     INSERT INTO inventory (name, quantity) VALUES ('banana', 150);
//     INSERT INTO inventory (name, quantity) VALUES ('orange', 154);
//     INSERT INTO inventory (name, quantity) VALUES ('apple', 100);
//   `;
//
//   client
//     .query(query)
//     .then(() => {
//       console.log('Table created successfully!');
//       client.end();
//     })
//     .catch(err => console.log(err))
//     .then(() => {
//       console.log('Finished execution, exiting now');
//       process.exit();
//     });
// };

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
  schedule: "* * * * *",
  handler: bukettiTimerTrigger
});

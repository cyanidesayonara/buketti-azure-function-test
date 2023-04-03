import { app, InvocationContext, Timer } from "@azure/functions";
import pg from 'pg';

export async function bukettiTimerTrigger(myTimer: Timer, context: InvocationContext): Promise<void> {

    const config = {
        host: 'buketti-azure-function-test-db.postgres.database.azure.com',
        user: 'testuser',
        password: 'buketti#2',
        database: 'postgres',
        port: 5432,
        ssl: true
    };

    const client = new pg.Client(config);

    client.connect(err => {
        if (err) throw err;
        else {
            // createDatabase();
            queryDatabase();
        }
    });

    function createDatabase() {
        const query = `
            DROP TABLE IF EXISTS inventory;
            CREATE TABLE inventory (id serial PRIMARY KEY, name VARCHAR(50), quantity INTEGER);
            INSERT INTO inventory (name, quantity) VALUES ('banana', 150);
            INSERT INTO inventory (name, quantity) VALUES ('orange', 154);
            INSERT INTO inventory (name, quantity) VALUES ('apple', 100);
        `;

        client
            .query(query)
            .then(() => {
                console.log('Table created successfully!');
                client.end(console.log('Closed client connection'));
            })
            .catch(err => console.log(err))
            .then(() => {
                console.log('Finished execution, exiting now');
                process.exit();
            });
    }

    function queryDatabase() {
        console.log(`Running query to PostgreSQL server: ${config.host}`);
        const query = 'SELECT * FROM inventory;';
        client.query(query)
            .then(res => {
                const rows = res.rows;
                rows.map(row => {
                    console.log(`Read: ${JSON.stringify(row)}`);
                });
                process.exit();
            })
            .catch(err => {
                console.log(err);
            });
    }
    context.log('Timer function processed request.');
}

app.timer('bukettiTimerTrigger', {
    schedule: '*/20 * * * * *',
    handler: bukettiTimerTrigger
});

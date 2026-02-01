const bcrypt = require("bcrypt");
const { Client } = require("pg");

async function main() {
  const hash = bcrypt.hashSync("admin123", 10);
  console.log("New hash:", hash);

  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "mama_ios",
    user: "postgres",
    password: "Ss520520"
  });

  try {
    await client.connect();
    const res = await client.query('UPDATE "User" SET password = $1 WHERE role = $2', [hash, "admin"]);
    console.log("Updated", res.rowCount, "rows");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();

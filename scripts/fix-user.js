const bcrypt = require("bcrypt");
const { Client } = require("pg");

async function main() {
  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "mama_ios",
    user: "postgres",
    password: "Ss520520"
  });

  try {
    await client.connect();

    // Set password for uu19700413 (lowercase username)
    const hash = bcrypt.hashSync("Ss590413", 10);
    const res = await client.query('UPDATE "User" SET password = $1, role = $2 WHERE username = $3', [hash, "admin", "uu19700413"]);
    console.log("uu19700413 password updated:", res.rowCount, "rows");

    // Show users
    const users = await client.query('SELECT id, username, role, password FROM "User" ORDER BY role DESC, username');
    console.log("\nAll users:");
    users.rows.forEach(u => {
      console.log(`  ${u.username} - ${u.role} - ${u.password ? 'has password' : 'no password'}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();

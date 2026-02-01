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

    // Set password for bossjy
    const hash1 = bcrypt.hashSync("ji394su3", 10);
    const res1 = await client.query('UPDATE "User" SET password = $1 WHERE username = $2', [hash1, "bossjy"]);
    console.log("bossjy password updated:", res1.rowCount, "rows");

    // Set password for Uu19700413 (boss's wife)
    const hash2 = bcrypt.hashSync("Ss590413", 10);
    const res2 = await client.query('UPDATE "User" SET password = $1 WHERE username = $2', [hash2, "Uu19700413"]);
    console.log("Uu19700413 password updated:", res2.rowCount, "rows");

    // Ensure both have admin role
    const res3 = await client.query('UPDATE "User" SET role = $1 WHERE username IN ($2, $3)', ["admin", "bossjy", "Uu19700413"]);
    console.log("Admin roles set:", res3.rowCount, "rows");

    // Show current users
    const users = await client.query('SELECT id, username, role FROM "User" ORDER BY role DESC, username');
    console.log("\nCurrent users:");
    users.rows.forEach(u => console.log(`  ${u.username} - ${u.role}`));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();

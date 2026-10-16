const readline = require('readline');
const bcrypt = require('bcrypt');
const db = require('./db');
const { initDatabase } = require('./init_db');

const prompt = (label) => new Promise((resolve) => {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  terminal.question(label, (answer) => {
    terminal.close();
    resolve(answer.trim());
  });
});

function promptHidden(label) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Run this command in an interactive terminal to enter the password safely.'));
      return;
    }

    let password = '';
    process.stdout.write(label);
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');

    const finish = (error) => {
      input.removeListener('data', onData);
      input.setRawMode(false);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(password);
    };

    const onData = (character) => {
      if (character === '\u0003') return finish(new Error('Password entry cancelled.'));
      if (character === '\r' || character === '\n') return finish();
      if (character === '\u007f' || character === '\b') {
        password = password.slice(0, -1);
        return;
      }
      if (character >= ' ') password += character;
    };

    input.on('data', onData);
  });
}

async function createFirstAdministrator() {
  await initDatabase();
  const [adminRows] = await db.query("SELECT COUNT(*) AS count FROM users WHERE role = 'Administrator'");
  if (Number(adminRows[0].count) > 0) {
    throw new Error('An administrator account already exists. Use the authenticated user-management screen to add accounts.');
  }

  const email = (await prompt('Administrator email: ')).toLowerCase();
  const fullName = await prompt('Administrator full name: ');
  const password = await promptHidden('Password (12-72 bytes, input hidden): ');
  const confirmation = await promptHidden('Confirm password (input hidden): ');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 190) {
    throw new Error('Enter a valid email address (maximum 190 characters).');
  }
  if (fullName.length < 2 || fullName.length > 100) {
    throw new Error('Full name must be between 2 and 100 characters.');
  }
  const passwordLength = Buffer.byteLength(password, 'utf8');
  if (passwordLength < 12 || passwordLength > 72) {
    throw new Error('Password must be between 12 and 72 UTF-8 bytes.');
  }
  if (password !== confirmation) {
    throw new Error('Passwords do not match.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    'INSERT INTO users (email, full_name, password_hash, role) VALUES (?, ?, ?, ?)',
    [email, fullName, passwordHash, 'Administrator']
  );
  console.log('First administrator created. The password was stored as a bcrypt hash.');
}

createFirstAdministrator()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());

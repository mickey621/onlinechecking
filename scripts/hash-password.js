const bcrypt = require('bcryptjs');
(async () => {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: npm run hash -- your_password');
    process.exit(1);
  }
  console.log(await bcrypt.hash(password, 10));
})();

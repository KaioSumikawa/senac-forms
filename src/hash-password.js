const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Informe uma senha com pelo menos 12 caracteres: npm run hash-password -- "sua-senha-forte"');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
}).catch((error) => {
  console.error("Não foi possível gerar o hash da senha.");
  process.exitCode = 1;
});

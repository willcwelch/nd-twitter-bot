exports.config = {
  mysql: {
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: 'twitterbot',
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT
  }
}
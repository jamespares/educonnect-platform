- ensure audio 
- set-up email password in railway
- add newsletter + blog
- ensure all CVs are uploaded as PDFs so can be sent to recruiters directly on WeChat
- add Stripe with Wechat + Alipay - our staff will pitch you to our database of chinese recruitment agencies, we will arrange an interview, help you prepare, support your move and hold your hand through the whole process
- The submission hit /api/submit-application and returned 200, so the Express route and validation passed. The entry doesn’t reach MySQL because the app never
  switches to MySQL at runtime: in database.js:3 we only check process.env.MYSQL_HOST. Railway injects its credentials as MYSQLHOST, MYSQLUSER, etc., so the
  flag stays false and the server boots SQLite (which lives inside the container and is wiped on redeploy). That’s why the admin dashboard looks empty and why
  adding a database volume doesn’t help.

  Here’s how to fix it:

  - In database.js:1 add a normalized config object that reads both naming styles:

    const MYSQL_CONFIG = {
      url: process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL,
      host: process.env.MYSQL_HOST || process.env.MYSQLHOST,
      port: process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306,
      user: process.env.MYSQL_USER || process.env.MYSQLUSER,
      password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
      database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE
    };

    const USE_MYSQL = Boolean(
      MYSQL_CONFIG.url ||
      (MYSQL_CONFIG.host && MYSQL_CONFIG.user && MYSQL_CONFIG.password && MYSQL_CONFIG.database)
    );
  - In database.js:22 update initMySQL() to reuse that object and support MYSQL_URL:

    const mysql = require('mysql2/promise');
    const poolConfig = MYSQL_CONFIG.url
      ? MYSQL_CONFIG.url
      : {
          host: MYSQL_CONFIG.host,
          port: Number(MYSQL_CONFIG.port) || 3306,
          user: MYSQL_CONFIG.user,
          password: MYSQL_CONFIG.password,
          database: MYSQL_CONFIG.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        };

    console.log('Initializing MySQL database connection…');
    if (!MYSQL_CONFIG.url) {
      console.log(`MySQL host: ${MYSQL_CONFIG.host}`);
      console.log(`MySQL database: ${MYSQL_CONFIG.database}`);
    } else {
      console.log('MySQL connection via URL');
    }

    this.pool = mysql.createPool(poolConfig);
    console.log('MySQL connection pool created');
  - Redeploy. The logs should now print “Initializing MySQL database connection…” followed by “MySQL connection pool created” instead of switching to SQLite.

  Once the app is actually using MySQL, submissions will land in your Railway MySQL service (and persist thanks to the volume you attached there). Re-run the
  migration script if you want to copy any existing SQLite data over.

  Next step: push the updated code, redeploy, confirm the log shows MySQL, then submit a test application and verify it appears in the admin dashboard.
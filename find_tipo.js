require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 50000
  }
};

async function findTypeTable() {
  try {
    let pool = await sql.connect(config);
    // get all tables with string columns
    let result = await pool.request().query(`
      SELECT t.name AS TableName, c.name AS ColumnName
      FROM sys.tables t
      JOIN sys.columns c ON t.object_id = c.object_id
      JOIN sys.types ty ON c.user_type_id = ty.user_type_id
      WHERE ty.name IN ('varchar', 'nvarchar', 'char', 'nchar')
      AND t.name LIKE '%tipo%'
    `);
    
    const columns = result.recordset;
    let foundTables = new Set();
    
    for (let col of columns) {
      if (foundTables.has(col.TableName)) continue;
      
      try {
        let check = await pool.request().query(`
          SELECT TOP 1 * FROM [${col.TableName}]
          WHERE [${col.ColumnName}] LIKE '%COBRO%' OR [${col.ColumnName}] LIKE '%VISITAS%' OR [${col.ColumnName}] LIKE '%TALLER%' OR [${col.ColumnName}] LIKE '%INSTALACION%'
        `);
        
        if (check.recordset.length > 0) {
          console.log(`Found in table: ${col.TableName}, Column: ${col.ColumnName}`);
          let allData = await pool.request().query(`SELECT * FROM [${col.TableName}]`);
          console.table(allData.recordset);
          foundTables.add(col.TableName);
        }
      } catch (e) {
        // ignore errors for specific table queries
      }
    }
    
    if (foundTables.size === 0) {
       console.log("No table found with those keywords in the columns of tables named 'tipo*'.");
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

findTypeTable();

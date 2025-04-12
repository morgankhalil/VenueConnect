/**
 * Standardize all constraint names to use camelCase format
 * This migration identifies and renames all foreign key constraints, primary keys,
 * and unique constraints to follow our camelCase naming convention.
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { SyncLogger } from "../server/core/sync-logger";

const logger = new SyncLogger('MigrationConstraintNames');

/**
 * Main migration function to standardize all constraint names
 */
async function main() {
  logger.log('Starting constraint name standardization', 'info');
  
  try {
    // Get all foreign key constraints with snake_case naming
    const foreignKeyConstraints = await db.execute(sql`
      SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
             ccu.table_name AS referenced_table_name, ccu.column_name AS referenced_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (tc.constraint_name LIKE '%\_%' OR tc.constraint_name LIKE '%.%')
      ORDER BY tc.table_name, kcu.column_name;
    `);

    logger.log(`Found ${foreignKeyConstraints.rows.length} foreign key constraints to rename`, 'info');

    // Rename each foreign key constraint
    for (const constraint of foreignKeyConstraints.rows) {
      const oldName = constraint.constraint_name as string;
      const tableName = constraint.table_name as string;
      const columnName = constraint.column_name as string;
      const referencedTableName = constraint.referenced_table_name as string;
      const referencedColumnName = constraint.referenced_column_name as string;
      
      // Convert to camelCase
      // Format: tableNameColumnNameReferencedTableNameReferencedColumnNameFk
      const newName = generateCamelCaseConstraintName(
        tableName, 
        columnName, 
        referencedTableName, 
        referencedColumnName,
        'Fk'
      );
      
      logger.log(`Renaming constraint: ${oldName} to ${newName}`, 'info');
      
      // Execute the rename operation
      await renameConstraint(tableName, oldName, newName);
    }
    
    // Get primary key constraints with snake_case naming
    const primaryKeyConstraints = await db.execute(sql`
      SELECT indexname, tablename 
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE '%\_%'
      AND indexdef LIKE '%PRIMARY KEY%'
      ORDER BY indexname;
    `);
    
    logger.log(`Found ${primaryKeyConstraints.rows.length} primary key constraints to rename`, 'info');
    
    // Rename each primary key constraint
    for (const constraint of primaryKeyConstraints.rows) {
      const oldName = constraint.indexname as string;
      const tableName = constraint.tablename as string;
      
      // Format: tableNamePkey
      const newName = `${tableName}Pkey`;
      
      logger.log(`Renaming primary key constraint: ${oldName} to ${newName}`, 'info');
      
      // Execute the rename operation
      await renameConstraint(tableName, oldName, newName);
    }
    
    // Get unique constraints with snake_case naming
    const uniqueConstraints = await db.execute(sql`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE '%\_%'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef NOT LIKE '%PRIMARY KEY%'
      ORDER BY indexname;
    `);
    
    logger.log(`Found ${uniqueConstraints.rows.length} unique constraints to rename`, 'info');
    
    // Rename each unique constraint
    for (const constraint of uniqueConstraints.rows) {
      const oldName = constraint.indexname as string;
      const tableName = constraint.tablename as string;
      
      // Extract column name from indexdef
      const indexDef = constraint.indexdef as string;
      const columnMatch = indexDef.match(/btree \(([^)]+)\)/i);
      let columnName = columnMatch ? columnMatch[1].replace(/"/g, '') : 'unknown';
      
      // Format: tableNameColumnNameUnique
      const newName = `${tableName}${toCamelCase(columnName)}Unique`;
      
      logger.log(`Renaming unique constraint: ${oldName} to ${newName}`, 'info');
      
      // Execute the rename operation
      await renameConstraint(tableName, oldName, newName);
    }
    
    logger.log('Successfully completed constraint name standardization', 'info');
  } catch (error) {
    logger.log(`Error in constraint name standardization: ${error}`, 'error');
    throw error;
  }
}

/**
 * Generate a camelCase constraint name from components
 */
function generateCamelCaseConstraintName(
  tableName: string, 
  columnName: string, 
  referencedTableName: string, 
  referencedColumnName: string,
  suffix: string
): string {
  return `${tableName}${toCamelCase(columnName)}${referencedTableName}${toCamelCase(referencedColumnName)}${suffix}`;
}

/**
 * Convert a snake_case or dot.notation string to camelCase
 */
function toCamelCase(str: string): string {
  // Replace dots with underscores first, then handle snake_case
  const normalized = str.replace(/\./g, '_');
  
  // Convert to camelCase
  return normalized
    .split('_')
    .map((word, index) => {
      // Always capitalize the first letter of each word (except the first word)
      return index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

/**
 * Rename a database constraint
 */
async function renameConstraint(tableName: string, oldName: string, newName: string): Promise<void> {
  try {
    await db.execute(sql`
      ALTER TABLE "${tableName}" 
      RENAME CONSTRAINT "${oldName}" TO "${newName}";
    `);
  } catch (error) {
    // If the error indicates the constraint is on an index, try renaming the index
    try {
      await db.execute(sql`
        ALTER INDEX "${oldName}" RENAME TO "${newName}";
      `);
    } catch (innerError) {
      logger.log(`Failed to rename constraint/index "${oldName}" to "${newName}": ${innerError}`, 'error');
      throw innerError;
    }
  }
}

// Run the migration
main()
  .then(() => {
    console.log('✅ Successfully standardized all constraint names to camelCase format');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error standardizing constraint names:', error);
    process.exit(1);
  });
/**
 * Query result export service
 */
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { executeQuery } from './query.js';
import type { APIResponse } from '../types/index.js';

// Export directory
const EXPORT_DIR = path.join(process.cwd(), 'exports');

// Create export directory
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

interface ExportParams {
  query: string;
  format: 'csv' | 'json' | 'xlsx';
  filename?: string;
  database?: string;
  schema?: string;
}

interface ExportResult {
  success: boolean;
  format?: string;
  path?: string;
  rowCount?: number;
  error?: string;
  message: string;
}

/**
 * Export query results function
 */
export async function exportResults(dbKey: string, params: ExportParams): Promise<APIResponse<ExportResult>> {
  const { query, format, filename, database, schema } = params;

  try {
    // Execute query
    const queryParams: any = { query };
    if (database) queryParams.database = database;
    if (schema) queryParams.schema = schema;

    const queryResult = await executeQuery(dbKey, queryParams);

    // If query execution fails
    if (!queryResult.success) {
      return {
        success: false,
        error: queryResult.error || 'Query execution error',
        message: 'Export was aborted due to query execution failure.'
      };
    }

    // If there are no results
    const results = queryResult.data?.results;
    if (!results || !Array.isArray(results) || results.length === 0) {
      return {
        success: false,
        error: 'No results to export.',
        message: 'Query results contain no data to export.'
      };
    }

    // Generate file name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `query_result_${timestamp}`;
    const actualFilename = (filename || defaultFilename).replace(/[^a-zA-Z0-9_-]/g, '_');

    // Process according to export format
    let fileContent = '';
    let fileExtension = '';
    let filePath = '';

    switch (format.toLowerCase()) {
      case 'csv':
        fileContent = convertToCSV(results);
        fileExtension = 'csv';
        filePath = path.join(EXPORT_DIR, `${actualFilename}.${fileExtension}`);
        fs.writeFileSync(filePath, fileContent, 'utf8');
        break;
      case 'json':
        fileContent = JSON.stringify(results, null, 2);
        fileExtension = 'json';
        filePath = path.join(EXPORT_DIR, `${actualFilename}.${fileExtension}`);
        fs.writeFileSync(filePath, fileContent, 'utf8');
        break;
      case 'xlsx':
        fileExtension = 'xlsx';
        filePath = path.join(EXPORT_DIR, `${actualFilename}.${fileExtension}`);
        await convertToXLSX(results, filePath);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return {
      success: true,
      data: {
        success: true,
        format: format.toLowerCase(),
        path: filePath,
        rowCount: results.length,
        message: `Query results successfully exported in ${format} format.`
      }
    };
  } catch (error: any) {
    console.error('Export error:', error);

    return {
      success: false,
      error: error.message,
      message: 'An error occurred while exporting query results.'
    };
  }
}

/**
 * Convert object array to CSV string
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return '';
  }

  // Extract headers
  const headers = Object.keys(data[0]);

  // Create header row
  const headerRow = headers.map(header => `"${header}"`).join(',');

  // Create data rows
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];

      // Handle null or undefined
      if (value === null || value === undefined) {
        return '""';
      }

      // Escape strings
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }

      // Convert objects to JSON string
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }

      return value;
    }).join(',');
  });

  // Final CSV string
  return [headerRow, ...rows].join('\n');
}

/**
 * Convert object array to XLSX file and save
 */
async function convertToXLSX(data: any[], filePath: string): Promise<void> {
  if (!data || data.length === 0) {
    throw new Error('No data to export.');
  }

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Query Results');

  // Extract headers
  const headers = Object.keys(data[0]);

  // Set headers
  worksheet.columns = headers.map(header => ({
    header: header,
    key: header,
    width: 15
  }));

  // Set header style
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Add data
  data.forEach(row => {
    const rowData: any = {};
    headers.forEach(header => {
      const value = row[header];
      
      // Handle null or undefined
      if (value === null || value === undefined) {
        rowData[header] = '';
      } else if (typeof value === 'object') {
        // Convert objects to JSON string
        rowData[header] = JSON.stringify(value);
      } else {
        rowData[header] = value;
      }
    });
    worksheet.addRow(rowData);
  });

  // Add auto filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };

  // Save to file
  await workbook.xlsx.writeFile(filePath);
}
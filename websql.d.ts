declare function openDatabase(
  name: string,
  version: any,
  displayName: string,
  size: number,
  upgrade?: DatabaseCallback): Database;

interface DatabaseCallback {
  (database: Database): void;
}

interface Database {
  transaction(
    callback: (transaction: SQLTransaction) => void,
    errorCallback?: (error: SQLError) => void,
    successCallback?: () => void);

  readTransaction(
    callback: (transaction: SQLTransaction) => void,
    errorCallback?: (error: SQLError) => void,
    successCallback?: () => void);

  version: string;

  changeVersion(
    oldVersion: string,
    newVersion: string,
    callback: (transaction: SQLTransaction) => void,
    errorCallback?: (error: SQLError) => void,
    successCallback?: () => void);
}

interface SQLTransaction {
  executeSql(
    sqlStatement: string,
    arguments?: any[],
    callback?: (transaction: SQLTransaction, result: SQLResultSet) => void,
    errorCallback?: (transaction: SQLTransaction, error: SQLError) => void): void;
}

interface SQLError {
  /**
   * UNKNOWN_ERR = 0;
   * DATABASE_ERR = 1;
   * VERSION_ERR = 2;
   * TOO_LARGE_ERR = 3;
   * QUOTA_ERR = 4;
   * SYNTAX_ERR = 5;
   * CONSTRAINT_ERR = 6;
  * TIMEOUT_ERR = 7;
   */
  code: number;
  message: string
}

interface SQLResultSet {
  insertId: number;
  rowsAffected: number;
  rows: SQLResultSetRowList;
}

interface SQLResultSetRowList {
  length: number;
  item(index: number): any;
}
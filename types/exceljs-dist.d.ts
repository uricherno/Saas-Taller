// La versión empaquetada de ExcelJS (dist/exceljs.min.js) trae todo adentro y no
// depende de unzipper/traverse/rimraf, que a veces faltan en instalaciones de Windows.
// Tiene la misma API, así que usa los mismos tipos que "exceljs".
declare module "exceljs/dist/exceljs.min.js" {
  import * as ExcelJS from "exceljs";
  export = ExcelJS;
}

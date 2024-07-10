"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const guard_1 = require("./guard");
const path = require("node:path");
const fs = require("fs");
const DATA_FILE_SUPPORTED_EXTENSIONS = ['.yaml', '.yml', '.json', '.jsn', '.template'];
const RULE_FILE_SUPPORTED_EXTENSIONS = ['.guard', '.ruleset'];
const formatOutput = ({ result, rulesNames, dataNames }) => {
    console.warn(rulesNames, dataNames);
    return result;
};
async function readFiles(dirPath, supportedExtensions) {
    const fileNames = [];
    const fileContents = [];
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const readPromises = files.map(async (file) => {
        const filePath = path.join(dirPath, file.name);
        if (!file.isDirectory() && supportedExtensions.includes(path.extname(filePath))) {
            const content = await fs.promises.readFile(filePath, 'utf8');
            fileNames.push(filePath);
            fileContents.push(content);
        }
    });
    await Promise.all(readPromises);
    return {
        fileContents,
        fileNames,
    };
}
const validate = async ({ rulesPath, dataPath }) => {
    const rulesResult = await readFiles(rulesPath, RULE_FILE_SUPPORTED_EXTENSIONS);
    const dataResult = await readFiles(dataPath, DATA_FILE_SUPPORTED_EXTENSIONS);
    const payload = {
        rules: rulesResult.fileContents,
        data: dataResult.fileContents,
    };
    const validateBuilder = new guard_1.ValidateBuilder();
    const result = validateBuilder
        .payload(true)
        .structured(true)
        .showSummary([guard_1.ShowSummaryType.None])
        .outputFormat(guard_1.OutputFormatType.Sarif)
        .tryBuildAndExecute(JSON.stringify(payload));
    return formatOutput({
        result,
        rulesNames: rulesResult.fileNames,
        dataNames: dataResult.fileNames,
    });
};
exports.validate = validate;

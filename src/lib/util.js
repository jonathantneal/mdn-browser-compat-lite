const { execSync } = require('child_process');
const { readFile, writeFile } = require('fs');

// run commands async
const pipeExec = (cmd, opts) => new Promise((resolve, reject) => {
	try {
		const execSyncOpts = Object.assign({ stdio: ['pipe', 'pipe', process.stderr] }, opts);

		const result = execSync(cmd, execSyncOpts);

		resolve(result);
	} catch (error) {
		reject(error);
	}
});

// read files async
const fsReadFile = path => new Promise((resolve, reject) => readFile(path, 'utf8', (error, data) => error ? reject(error) : resolve(data)));

// write files async
const fsWriteFile = (path, data) => new Promise((resolve, reject) => writeFile(path, data, error => error ? reject(error) : resolve()));

// exports
exports.pipeExec = pipeExec;
exports.fsReadFile = fsReadFile;
exports.fsWriteFile = fsWriteFile;

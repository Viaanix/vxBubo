// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vx-bubo-test" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('vx-bubo-test.helloWorld', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from vx-bubo-test!');
	});

	context.subscriptions.push(disposable);

	let deployWidget = vscode.commands.registerCommand('vx-bubo-test.widget.deploy', async function (event) {
		
		console.log(`YOLO =>`, event)
		const localTerminals = vscode.window.terminals.filter((terminal) => terminal.name === 'vx-bubo');
		let terminal 
		if (!localTerminals.length) {
			terminal = vscode.window.createTerminal({
				name: 'vx-bubo',
				hideFromUser: false,
			});
			
		} else {
			terminal = localTerminals[0]
		}
		terminal.show();
		terminal.sendText(`npx vx-bubo --deployWidget '${event.path}' `, true);
		vscode.window.showInformationMessage('Widget Deployed');
		console.log(`terminals: => `, vscode.window.terminals)
	});

	context.subscriptions.push(deployWidget);
}

function selectTerminal() {
	const terminals = vscode.window.terminals;
	const items = terminals.map(t => {
		return {
			label: `name: ${t.name}`,
			terminal: t
		};
	});
	return vscode.window.showQuickPick(items).then(item => {
		return item ? item.terminal : undefined;
	});
}

function ensureTerminalExists() {
	if (vscode.window.terminals.length === 0) {
		vscode.window.showErrorMessage('No active terminals');
		return false;
	}
	return true;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}

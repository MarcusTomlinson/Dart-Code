import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as sinon from "sinon";
import * as vs from "vscode";
import { FLUTTER_STAGEHAND_PROJECT_TRIGGER_FILE } from "../../../shared/constants";
import { StagehandTemplate } from "../../../shared/interfaces";
import { fsPath } from "../../../shared/vscode/utils";
import { attachLoggingWhenExtensionAvailable, ext, getRandomTempFolder, logger, sb } from "../../helpers";

describe("test environment", () => {
	it("has opened the correct folder", () => {
		const wfs = vs.workspace.workspaceFolders || [];
		assert.equal(wfs.length, 1);
		assert.ok(
			fsPath(wfs[0].uri).endsWith(path.sep + "empty"),
			`${fsPath(wfs[0].uri)} doesn't end with ${path.sep}empty`,
		);
	});
});

describe("extension", () => {
	it("did not activate", async () => {
		assert.equal(ext.isActive, false);
	});
});

// Note: We can only really have one "real" test here because it'll activate the extension.
// Other tests must go in their own folders and be listed in test_all/launch.json individually.

describe("command", () => {
	it("Flutter: New Web Project can be invoked and creates trigger file", async () => {
		attachLoggingWhenExtensionAvailable();
		const projectName = "my_test_fweb_proj";
		const templateName = "flutter-web-preview";
		const templateEntrypoint = "web/index.html";

		const showInputBox = sb.stub(vs.window, "showInputBox");
		showInputBox.resolves(projectName);

		const showOpenDialog = sb.stub(vs.window, "showOpenDialog");
		const tempFolder = getRandomTempFolder();
		showOpenDialog.resolves([vs.Uri.file(tempFolder)]);

		const showQuickPick = sb.stub(vs.window, "showQuickPick");
		type SnippetOption = vs.QuickPickItem & { template: StagehandTemplate };
		showQuickPick.callsFake((items: SnippetOption[]) => items.find((t) => t.template.name === templateName));

		// Intercept executeCommand for openFolder so we don't spawn a new instance of Code!
		const executeCommand = sb.stub(vs.commands, "executeCommand").callThrough();
		const openFolder = executeCommand.withArgs("vscode.openFolder", sinon.match.any, sinon.match.any).resolves();

		logger.info("Executing createWebProject command");
		await vs.commands.executeCommand("flutter.createWebProject");
		logger.info("Finished executing createWebProject command");

		// TODO: Uncomment this when we have more than one Flutter web template.
		// assert.ok(showQuickPick.calledOnce);
		assert.ok(openFolder.calledOnce);
		const triggerFile = path.join(tempFolder, projectName, FLUTTER_STAGEHAND_PROJECT_TRIGGER_FILE);
		assert.ok(fs.existsSync(triggerFile));
		const recordedTemplateJson = fs.readFileSync(triggerFile).toString().trim();
		const recordedTemplate = JSON.parse(recordedTemplateJson) as StagehandTemplate;
		assert.equal(recordedTemplate.name, templateName);
		assert.equal(recordedTemplate.entrypoint, templateEntrypoint);
	});
});
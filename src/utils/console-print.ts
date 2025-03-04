import chalk from "chalk";
import ora from "ora";

const Spinner = ora();

export function printSuccess(message: string, withIcon: boolean = true) {
  console.log(chalk.green(`${withIcon ? "✔ " : ""}${message}`));
}

export function printError(message: string, withIcon: boolean = true) {
  console.log(chalk.red(`${withIcon ? "✖ " : ""}${message}`));
}

export function printInfo(message: string) {
  console.log(chalk.gray(`${message}`));
}

export function printTitleInfo(message: string) {
  console.log(chalk.blue(`${message}`));
}

export function printWarning(message: string, withIcon: boolean = true) {
  console.log(chalk.yellow(`${withIcon ? "⚠️ " : ""}${message}`));
}

export function showProgress(message: string) {
  Spinner.start(chalk.cyan(`${message}\n`));
}

export function stopProgress(message: string, success = true) {
  if (success) Spinner.succeed(chalk.green(`${message}`));
  else Spinner.fail(chalk.red(`${message}`));
}

export function printSuccessMessage(filePath: string) {
  console.log(`\n${"-".repeat(50)}`);
  console.log(`✔ File Processed Successfully`);
  console.log(`✔ File Path: ${filePath}`);
  console.log(`${"-".repeat(50)}\n`);
}

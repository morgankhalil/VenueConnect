import * as readline from 'readline';

/**
 * Prompt the user for an API key in the terminal
 * @param keyName The name of the key to ask for (e.g., 'OpenAI API Key')
 * @returns The key entered by the user
 */
export async function askKey(keyName: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`Please enter your ${keyName}: `, (key) => {
      rl.close();
      resolve(key.trim());
    });
  });
}
import { AnsiString, ErrorMessage, ParsingCallback, Range } from '../library/index.js';
import { getSymbol, jsonImportOptions } from '../library/utils.js';

/**
 * Create a parsing callback for numbers that should be within a range.
 * @param range The numeric range
 * @param phrase The custom error phrase
 * @returns The parsing callback
 */
export function numberInRange(range: Range, phrase: string): ParsingCallback<string, number> {
  const [min, max] = range;
  return function (param, info) {
    const num = Number(param);
    if (info.comp || (min <= num && num <= max)) {
      return num; // handle NaN; avoid throwing errors when completion is in effect
    }
    throw ErrorMessage.createCustom(phrase, {}, getSymbol(info.name), param, range);
  };
}

/**
 * Gets a version field from a JSON module.
 * @param jsonModule The ID of the JSON module
 * @returns The version, if the module was found; otherwise undefined
 */
export async function getVersion(jsonModule: string): Promise<string | undefined> {
  const json = await import(jsonModule, jsonImportOptions);
  return json?.version as string | undefined;
}

/**
 * Create a footer text to be used in help sections.
 * @param packageJsonModule The module ID of the package.json file
 * @param phrase The custom phrase for the footer
 * @param suffix A suffix to append to the repository URL
 * @returns The footer ANSI string, if a package.json file was found; otherwise undefined
 */
export async function sectionFooter(
  packageJsonModule: string,
  phrase: string = '#0',
  suffix: string = '',
): Promise<AnsiString | undefined> {
  const packageJson = await import(packageJsonModule, jsonImportOptions);
  if (packageJson) {
    const { repository } = packageJson as { repository?: string | { url?: string } };
    if (repository) {
      const repoUrl = typeof repository === 'string' ? repository : repository.url;
      if (repoUrl) {
        let url = repoUrl.replace(/(?:^git\+|\.git$)/g, '');
        if (!url.startsWith('https:')) {
          const [host, repo] = url.split(':');
          url = `https://${repo ? host : 'github'}.com/${repo ?? host}`;
        }
        return new AnsiString().format(phrase, {}, new URL(url + suffix));
      }
    }
  }
  return undefined;
}
